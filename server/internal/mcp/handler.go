// Package mcp implements the stateless Streamable-HTTP MCP 2026-07-28 JSON-RPC
// endpoint advertised at https://hoa.tanhdev.com/.well-known/mcp/server-card.json.
package mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/vesviet-team/vietnam-accounting-api/internal/httpx"
)

const ProtocolVersion = "2026-07-28"

type Handler struct{}

type rpcRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		httpx.JSON(w, http.StatusOK, map[string]any{
			"name":            "vietnam-accounting-learning-mcp",
			"protocolVersion": ProtocolVersion,
			"transport":       "streamable-http",
			"endpoint":        "https://hoa.tanhdev.com/mcp",
			"serverCard":      "https://hoa.tanhdev.com/.well-known/mcp/server-card.json",
			"tools":           toolDefs(),
		})
	case http.MethodPost:
		var req rpcRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10)).Decode(&req); err != nil {
			httpx.JSON(w, http.StatusBadRequest, rpcError(nil, -32700, "parse error"))
			return
		}
		if req.JSONRPC != "2.0" || req.Method == "" {
			httpx.JSON(w, http.StatusBadRequest, rpcError(req.ID, -32600, "invalid request"))
			return
		}
		switch req.Method {
		case "initialize":
			httpx.JSON(w, http.StatusOK, rpcResult(req.ID, map[string]any{
				"protocolVersion": ProtocolVersion,
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo": map[string]any{
					"name":    "vietnam-accounting-learning-mcp",
					"version": "1.1.0",
				},
			}))
		case "notifications/initialized":
			w.WriteHeader(http.StatusAccepted)
		case "ping":
			httpx.JSON(w, http.StatusOK, rpcResult(req.ID, map[string]any{}))
		case "tools/list":
			httpx.JSON(w, http.StatusOK, rpcResult(req.ID, map[string]any{"tools": toolDefs()}))
		case "tools/call":
			var p struct {
				Name      string         `json:"name"`
				Arguments map[string]any `json:"arguments"`
			}
			if len(req.Params) > 0 {
				if err := json.Unmarshal(req.Params, &p); err != nil {
					httpx.JSON(w, http.StatusBadRequest, rpcError(req.ID, -32602, "invalid params"))
					return
				}
			}
			res, rpcErr := callTool(p.Name, p.Arguments)
			if rpcErr != nil {
				httpx.JSON(w, http.StatusOK, rpcError(req.ID, -32602, rpcErr.Error()))
				return
			}
			httpx.JSON(w, http.StatusOK, rpcResult(req.ID, res))
		default:
			httpx.JSON(w, http.StatusOK, rpcError(req.ID, -32601, "method not found"))
		}
	default:
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method_not_allowed"})
	}
}

func rpcResult(id, result any) map[string]any {
	return map[string]any{"jsonrpc": "2.0", "id": id, "result": result}
}

func rpcError(id any, code int, msg string) map[string]any {
	return map[string]any{
		"jsonrpc": "2.0",
		"id":      id,
		"error":   map[string]any{"code": code, "message": msg},
	}
}

func toolDefs() []map[string]any {
	return []map[string]any{
		{
			"name":        "lookup_vietnam_account",
			"description": "Search Vietnamese Chart of Accounts guidance across Circular 99/2025/TT-BTC, Circular 58/2026/TT-BTC, Circular 200/2014/TT-BTC, and Circular 133/2016/TT-BTC.",
			"inputSchema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"code":   map[string]any{"type": "string", "description": "Account code (e.g. '111', '154', '642')"},
					"regime": map[string]any{"type": "string", "enum": []string{"CIRCULAR_99", "CIRCULAR_58", "CIRCULAR_200", "CIRCULAR_133"}},
				},
				"required": []string{"code"},
			},
		},
		{
			"name":        "evaluate_tax_guardrails",
			"description": "Evaluate non-cash payment rule (5M VND VAT Law 48/2024/QH15 & 20M VND legacy threshold) and vendor tax status (00/03/04).",
			"inputSchema": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"totalAmount":     map[string]any{"type": "number"},
					"paymentMethod":   map[string]any{"type": "string"},
					"vendorTaxStatus": map[string]any{"type": "string", "enum": []string{"00", "03", "04"}},
				},
				"required": []string{"totalAmount", "paymentMethod"},
			},
		},
	}
}

func callTool(name string, args map[string]any) (map[string]any, error) {
	switch name {
	case "evaluate_tax_guardrails":
		amount, _ := args["totalAmount"].(float64)
		method, _ := args["paymentMethod"].(string)
		status, _ := args["vendorTaxStatus"].(string)
		isCash := strings.EqualFold(strings.TrimSpace(method), "CASH") || strings.Contains(strings.ToLower(method), "tiền mặt")
		vat5MOk := !isCash || amount < 5_000_000
		legacy20MOk := !isCash || amount < 20_000_000
		statusRisk := status == "03" || status == "04"
		summary := map[string]any{
			"vatLaw48ThresholdVnd": 5_000_000,
			"legacyThresholdVnd":   20_000_000,
			"vatCreditable2025":    vat5MOk && !statusRisk,
			"legacy20MCreditable":  legacy20MOk && !statusRisk,
			"vendorStatusFlagged":  statusRisk,
		}
		raw, _ := json.Marshal(summary)
		return map[string]any{
			"content":           []map[string]any{{"type": "text", "text": string(raw)}},
			"structuredContent": summary,
			"isError":           false,
		}, nil
	case "lookup_vietnam_account":
		code, _ := args["code"].(string)
		regime, _ := args["regime"].(string)
		code = strings.TrimSpace(code)
		if code == "" {
			return nil, fmt.Errorf("code is required")
		}
		if regime == "" {
			regime = "CIRCULAR_99"
		}
		prohibitedIn133 := map[string]bool{
			"142": true, "244": true, "521": true, "621": true, "622": true, "623": true, "627": true, "641": true,
		}[code]
		info := map[string]any{
			"code":            code,
			"regime":          regime,
			"prohibitedIn133": regime == "CIRCULAR_133" && prohibitedIn133,
			"explorerUrl":     fmt.Sprintf("https://hoa.tanhdev.com/#coa"),
		}
		raw, _ := json.Marshal(info)
		return map[string]any{
			"content":           []map[string]any{{"type": "text", "text": string(raw)}},
			"structuredContent": info,
			"isError":           false,
		}, nil
	default:
		return nil, fmt.Errorf("unknown tool: %s", name)
	}
}
