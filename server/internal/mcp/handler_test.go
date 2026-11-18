package mcp

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMCPHandler_GetAndToolsCall(t *testing.T) {
	h := &Handler{}

	// GET /mcp returns server metadata
	req := httptest.NewRequest(http.MethodGet, "/mcp", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /mcp status = %d, want 200", rec.Code)
	}

	// POST /mcp tools/call evaluate_tax_guardrails
	body := `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"evaluate_tax_guardrails","arguments":{"totalAmount":6000000,"paymentMethod":"CASH","vendorTaxStatus":"00"}}}`
	req = httptest.NewRequest(http.MethodPost, "/mcp", bytes.NewBufferString(body))
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("POST /mcp status = %d, want 200", rec.Code)
	}
	var out struct {
		Result struct {
			StructuredContent map[string]any `json:"structuredContent"`
		} `json:"result"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if out.Result.StructuredContent["vatCreditable2025"] != false {
		t.Fatalf("expected 6M CASH not VAT creditable under 5M law, got %+v", out.Result.StructuredContent)
	}
}
