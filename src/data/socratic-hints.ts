/**
 * Socratic Pedagogical Hint Database for Journalizer Workbench
 * Provides a 3-tier graduated hint ladder:
 * - Level 1 (Positioning / Định vị): suggests relevant account groups or parent accounts
 * - Level 2 (Nature / Bản chất): reflective questions on asset/liability/equity/revenue/expense movements
 * - Level 3 (Twin Analogous Case / Mẫu tương tự): isomorphic business example with solved entries for deductive reasoning
 */

export interface SocraticHint {
  level: 1 | 2 | 3;
  title: string;
  content: string;
  suggestedAccountGroups?: string[]; // Level 1
  reflectiveQuestions?: string[];     // Level 2
  twinCase?: {                        // Level 3
    scenario: string;
    sampleJournal: Array<{
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
    }>;
    explanation: string;
  };
}

export interface ScenarioHints {
  scenarioId: string;
  scenarioTitle: string;
  hints: [SocraticHint, SocraticHint, SocraticHint];
}

export const SCENARIO_HINTS: Record<string, ScenarioHints> = {
  'scen-01': {
    scenarioId: 'scen-01',
    scenarioTitle: 'Rút tiền gửi ngân hàng về nhập quỹ tiền mặt',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định các nhóm tài khoản phản ánh sự luân chuyển nội bộ nguồn vốn bằng tiền của doanh nghiệp mà không làm thay đổi tổng tài sản.',
        suggestedAccountGroups: [
          'Nhóm TK 111 - Tiền mặt (Loại 1: Tài sản ngắn hạn)',
          'Nhóm TK 112 - Tiền gửi ngân hàng (Loại 1: Tài sản ngắn hạn)',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Phân tích sự biến động tăng / giảm giữa các đối tượng tài sản ngắn hạn theo nguyên lý kế toán kép:',
        reflectiveQuestions: [
          'Nghiệp vụ này là sự hoán đổi giữa hai đối tượng tài sản (Tăng tài sản này - Giảm tài sản khác) hay làm phát sinh nguồn vốn?',
          'Tiền mặt tại quỹ của công ty tăng lên hay giảm đi? Đối với tài khoản tài sản (Loại 1), số phát sinh tăng được ghi vào bên Nợ hay bên Có?',
          'Tiền gửi trong tài khoản ngân hàng tăng hay giảm? Đối với tài khoản tài sản, số phát sinh giảm được ghi vào bên Nợ hay bên Có?',
          'Tổng quy mô tài sản của doanh nghiệp sau khi thực hiện rút tiền có bị thay đổi không?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Quan sát một nghiệp vụ chuyển dịch vốn bằng tiền tương tự để suy luận chiều hạch toán đối ứng:',
        twinCase: {
          scenario:
            'Doanh nghiệp cử thủ quỹ mang 30.000.000 VNĐ tiền mặt từ quỹ công ty đến ngân hàng nộp vào tài khoản thanh toán Vietcombank (theo Giấy báo Có số 00452).',
          sampleJournal: [
            {
              accountCode: '1121',
              accountName: 'Tiền gửi ngân hàng (VNĐ)',
              debit: 30000000,
              credit: 0,
            },
            {
              accountCode: '1111',
              accountName: 'Tiền mặt (VNĐ)',
              debit: 0,
              credit: 30000000,
            },
          ],
          explanation:
            'Khi nộp tiền vào ngân hàng, tiền gửi tăng lên nên ghi Nợ TK 1121; tiền mặt tại quỹ xuất ra nên ghi Có TK 1111. Đối với tình huống rút tiền ngân hàng về nhập quỹ, luồng tiền vận động ngược lại: Tiền mặt tăng (Nợ 1111) và Tiền gửi ngân hàng giảm (Có 1121).',
        },
      },
    ],
  },
  'scen-02': {
    scenarioId: 'scen-02',
    scenarioTitle: 'Mua nguyên vật liệu nhập kho chưa trả tiền người bán (VAT 10%)',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định nhóm tài khoản theo dõi hàng tồn kho nhập kho, thuế GTGT đầu vào được khấu trừ và nghĩa vụ nợ công nợ đối với nhà cung cấp.',
        suggestedAccountGroups: [
          'Nhóm TK 152 - Nguyên liệu, vật liệu (Loại 1: Hàng tồn kho)',
          'Nhóm TK 133 - Thuế GTGT được khấu trừ (TK 1331: Thuế GTGT đầu vào của HHDV)',
          'Nhóm TK 331 - Phải trả cho người bán (Loại 3: Nợ phải trả)',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Phân tích bản chất biến động tài sản và nghĩa vụ nợ phải trả theo chuẩn mực kế toán VAS 02:',
        reflectiveQuestions: [
          'Nguyên vật liệu nhập vào kho làm tăng tài sản hàng tồn kho của doanh nghiệp. Tài sản tăng ghi vào bên Nợ hay bên Có của TK 152?',
          'Thuế GTGT 10% đầu vào được khấu trừ theo hóa đơn hợp pháp là tài sản thuế được khấu trừ. Khi phát sinh tăng thuế GTGT đầu vào, bạn ghi vào bên Nợ hay Có của TK 1331?',
          'Công ty chưa thanh toán tiền cho bên bán nên phát sinh nghĩa vụ nợ phải trả. Với tài khoản nợ phải trả (Loại 3), phát sinh tăng công nợ ghi vào bên Nợ hay bên Có?',
          'Đẳng thức cân bằng: Tổng giá trị công nợ phải trả (Bên Có TK 331) có bằng đúng giá mua chưa thuế (Nợ TK 152) cộng với thuế GTGT (Nợ TK 1331) không?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Xem xét một nghiệp vụ mua tài sản tồn kho chưa thanh toán có cơ cấu bút toán hoàn toàn đẳng cấu (Isomorphic):',
        twinCase: {
          scenario:
            'Công ty mua một lô công cụ dụng cụ nhập kho từ nhà cung cấp An Phát theo Hóa đơn GTGT số 000892: Giá mua chưa thuế 15.000.000 VNĐ, thuế GTGT 10% (1.500.000 VNĐ), chưa thanh toán.',
          sampleJournal: [
            {
              accountCode: '153',
              accountName: 'Công cụ, dụng cụ',
              debit: 15000000,
              credit: 0,
            },
            {
              accountCode: '1331',
              accountName: 'Thuế GTGT đầu vào được khấu trừ',
              debit: 1500000,
              credit: 0,
            },
            {
              accountCode: '331',
              accountName: 'Phải trả cho người bán (An Phát)',
              debit: 0,
              credit: 16500000,
            },
          ],
          explanation:
            'Theo phương pháp khấu trừ thuế: Giá mua chưa thuế ghi tăng tài sản (Nợ TK 153 hoặc TK 152), thuế GTGT đầu vào ghi Nợ TK 1331, và tổng nghĩa vụ thanh toán cho nhà cung cấp ghi Có TK 331.',
        },
      },
    ],
  },
  'scen-03': {
    scenarioId: 'scen-03',
    scenarioTitle: 'Xuất bán hàng hóa thu tiền ngay qua chuyển khoản (VAT 10%)',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định nhóm tài khoản theo dõi tiền gửi ngân hàng nhận về, doanh thu bán hàng phát sinh và nghĩa vụ thuế GTGT đầu ra phải nộp ngân sách.',
        suggestedAccountGroups: [
          'Nhóm TK 112 - Tiền gửi ngân hàng (TK 1121: Tiền gửi VNĐ)',
          'Nhóm TK 511 - Doanh thu bán hàng và cung cấp dịch vụ (TK 5111)',
          'Nhóm TK 333 - Thuế và các khoản phải nộp Nhà nước (TK 33311: Thuế GTGT đầu ra)',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Phân tích ghi nhận doanh thu và dòng tiền theo nguyên tắc cơ sở dồn tích (VAS 14):',
        reflectiveQuestions: [
          'Tiền của khách hàng chuyển khoản vào tài khoản ngân hàng của doanh nghiệp làm tăng đối tượng tài sản nào? Tăng ghi bên Nợ hay bên Có?',
          'Doanh thu bán hàng hóa phát sinh trong kỳ làm tăng kết quả kinh doanh. Đối với tài khoản Doanh thu (Loại 5), phát sinh tăng ghi vào bên Nợ hay bên Có?',
          'Khoản thuế GTGT 10% tính trên hóa đơn là nghĩa vụ phải nộp cho Nhà nước (Nợ phải trả Loại 3). Khi phát sinh nghĩa vụ thuế đầu ra, ghi vào bên Nợ hay bên Có của TK 33311?',
          'Số tiền thực tế tiền gửi ngân hàng nhận được (bên Nợ) là giá chưa thuế hay tổng giá thanh toán (đã bao gồm thuế GTGT)?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Nghiên cứu trường hợp bán dịch vụ thu tiền ngay có cùng nguyên tắc đối ứng doanh thu và thuế đầu ra:',
        twinCase: {
          scenario:
            'Công ty hoàn thành hợp đồng cung cấp dịch vụ tư vấn quản trị cho khách hàng Sao Mai, khách hàng thanh toán chuyển khoản ngay: Giá dịch vụ chưa thuế 25.000.000 VNĐ, thuế GTGT 10% (2.500.000 VNĐ).',
          sampleJournal: [
            {
              accountCode: '1121',
              accountName: 'Tiền gửi ngân hàng (VNĐ)',
              debit: 27500000,
              credit: 0,
            },
            {
              accountCode: '5113',
              accountName: 'Doanh thu cung cấp dịch vụ',
              debit: 0,
              credit: 25000000,
            },
            {
              accountCode: '33311',
              accountName: 'Thuế GTGT đầu ra phải nộp',
              debit: 0,
              credit: 2500000,
            },
          ],
          explanation:
            'Ghi nhận doanh thu bán hàng/dịch vụ thu tiền ngay: Ghi Nợ TK Tiền (1121) cho tổng giá thanh toán nhận về, ghi Có TK Doanh thu (511) theo giá chưa thuế, và ghi Có TK 33311 phản ánh thuế GTGT đầu ra phải nộp.',
        },
      },
    ],
  },
  'scen-04': {
    scenarioId: 'scen-04',
    scenarioTitle: 'Chi tiền mặt tạm ứng công tác phí cho nhân viên',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định các nhóm tài khoản theo dõi khoản nợ tạm ứng giao cho người lao động và phương tiện thanh toán xuất quỹ.',
        suggestedAccountGroups: [
          'Nhóm TK 141 - Tạm ứng (Loại 1: Tài sản ngắn hạn khác)',
          'Nhóm TK 111 - Tiền mặt (TK 1111: Tiền mặt VNĐ tại quỹ)',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Phân tích bản chất tài sản tạm ứng và quản lý công nợ nội bộ theo quy định kế toán:',
        reflectiveQuestions: [
          'Khoản tiền tạm ứng giao cho nhân viên đi công tác tại thời điểm xuất quỹ đã được tính vào chi phí sản xuất kinh doanh hay chưa?',
          'Khoản nợ tạm ứng mà nhân viên phải chịu trách nhiệm thanh toán hoặc hoàn ứng tăng lên hay giảm đi? TK 141 thuộc nhóm tài sản nào và phát sinh tăng ghi Nợ hay Có?',
          'Doanh nghiệp xuất tiền mặt từ két quỹ để chi tạm ứng thì số dư tiền mặt tại quỹ tăng hay giảm? Ghi bên Nợ hay bên Có của TK 1111?',
          'Bản chất của nghiệp vụ này có làm thay đổi tổng tài sản của công ty hay chỉ là sự chuyển hóa giữa hai khoản mục tài sản ngắn hạn?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Nghiên cứu ví dụ tạm ứng bằng phương thức chuyển khoản có cùng cơ chế hạch toán tạm ứng:',
        twinCase: {
          scenario:
            'Doanh nghiệp lập Ủy nhiệm chi số UNC-089 trích tiền gửi ngân hàng chuyển khoản 15.000.000 VNĐ tạm ứng cho nhân viên phòng mua hàng đi thu mua nông sản tại vùng nguyên liệu.',
          sampleJournal: [
            {
              accountCode: '141',
              accountName: 'Tạm ứng (NV mua hàng)',
              debit: 15000000,
              credit: 0,
            },
            {
              accountCode: '1121',
              accountName: 'Tiền gửi ngân hàng (VNĐ)',
              debit: 0,
              credit: 15000000,
            },
          ],
          explanation:
            'Bút toán chi tạm ứng: Luôn ghi Nợ TK 141 để theo dõi trách nhiệm hoàn ứng của cá nhân người nhận tạm ứng, đồng thời ghi Có TK Tiền tương ứng (Có 1111 nếu chi tiền mặt, hoặc Có 1121 nếu chi qua ngân hàng).',
        },
      },
    ],
  },
  'scen-05': {
    scenarioId: 'scen-05',
    scenarioTitle: 'Chi phí bán hàng / quảng cáo (Phân biệt TT 200 vs TT 133)',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định nhóm tài khoản chi phí tiêu thụ, thuế đầu vào và tài khoản tiền gửi thanh toán, chú ý sự phân định giữa Thông tư 200 và Thông tư 133.',
        suggestedAccountGroups: [
          'Thông tư 200: Nhóm TK 641 - Chi phí bán hàng (TK 6418: Chi phí dịch vụ mua ngoài)',
          'Thông tư 133: BÃI BỎ TK 641 -> Phải dùng TK 6421 (Chi phí bán hàng thuộc TK 642)',
          'Nhóm TK 133 - Thuế GTGT được khấu trừ (TK 1331)',
          'Nhóm TK 112 - Tiền gửi ngân hàng (TK 1121)',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Phân tích chi phí hoạt động kinh doanh và rào chắn chuẩn mực pháp lý giữa hai chế độ kế toán:',
        reflectiveQuestions: [
          'Chi phí quảng cáo là chi phí phát sinh phục vụ quá trình tiêu thụ sản phẩm (Chi phí hoạt động - Loại 6). Khi chi phí phát sinh tăng thì ghi vào bên Nợ hay bên Có?',
          'Thuế GTGT đầu vào của dịch vụ quảng cáo phục vụ hoạt động chịu thuế GTGT được khấu trừ toàn bộ, ghi tăng vào bên Nợ hay bên Có của TK 1331?',
          'Ủy nhiệm chi chuyển khoản thanh toán từ ngân hàng làm giảm tiền gửi, ghi vào bên Nợ hay bên Có của TK 1121?',
          'RÀO CHẮN PHÁP LÝ QUAN TRỌNG: Nếu doanh nghiệp áp dụng Thông tư 133/2016/TT-BTC, tài khoản cấp 1 nào bị NGHIÊM CẤM sử dụng và bắt buộc phải chuyển sang tiểu khoản nào?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Quan sát ví dụ chi phí vận chuyển bán hàng thanh toán qua ngân hàng để nhận diện chuẩn mực đối ứng:',
        twinCase: {
          scenario:
            'Doanh nghiệp chi tiền gửi ngân hàng thanh toán cước vận chuyển giao hàng hóa cho khách: Giá cước chưa thuế 10.000.000 VNĐ, thuế GTGT 10% (1.000.000 VNĐ). Doanh nghiệp áp dụng TT 200 (hoặc TT 133).',
          sampleJournal: [
            {
              accountCode: '641',
              accountName: 'Chi phí bán hàng (TT 200) / TK 6421 (TT 133)',
              debit: 10000000,
              credit: 0,
            },
            {
              accountCode: '1331',
              accountName: 'Thuế GTGT đầu vào được khấu trừ',
              debit: 1000000,
              credit: 0,
            },
            {
              accountCode: '1121',
              accountName: 'Tiền gửi ngân hàng (VNĐ)',
              debit: 0,
              credit: 11000000,
            },
          ],
          explanation:
            'Chi phí phát sinh cho hoạt động bán hàng: Ghi Nợ TK Chi phí bán hàng (TK 641 trong TT 200, hoặc TK 6421 trong TT 133 vì TT 133 không có TK 641), ghi Nợ TK 1331 thuế đầu vào, và ghi Có TK 1121 cho tổng giá thanh toán.',
        },
      },
    ],
  },
  'scen-custom': {
    scenarioId: 'scen-custom',
    scenarioTitle: 'Nghiệp vụ tự do (Tự tạo bút toán)',
    hints: [
      {
        level: 1,
        title: 'Nấc 1: Định vị Nhóm Tài Khoản Liên Quan',
        content:
          'Xác định ít nhất hai đối tượng kế toán có mối quan hệ đối ứng trong nghiệp vụ tự do của bạn theo 9 loại tài khoản trong Hệ thống Tài khoản Kế toán Việt Nam.',
        suggestedAccountGroups: [
          'Loại 1 & 2: Tài sản ngắn hạn & dài hạn (Tiền, Phải thu, Hàng tồn kho, TSCĐ)',
          'Loại 3 & 4: Nợ phải trả & Nguồn vốn chủ sở hữu',
          'Loại 5 & 7: Doanh thu & Thu nhập khác',
          'Loại 6 & 8: Chi phí sản xuất kinh doanh & Chi phí khác',
        ],
      },
      {
        level: 2,
        title: 'Nấc 2: Câu Hỏi Tư Duy Bản Chất Biến Động',
        content:
          'Đối chiếu với 4 quan hệ đối ứng cơ bản của kế toán kép để xác định chiều ghi chép:',
        reflectiveQuestions: [
          'Nghiệp vụ của bạn thuộc dạng đối ứng nào: (1) Tăng Tài sản - Giảm Tài sản, (2) Tăng Nguồn vốn - Giảm Nguồn vốn, (3) Tăng Tài sản - Tăng Nguồn vốn, hay (4) Giảm Tài sản - Giảm Nguồn vốn?',
          'Mỗi dòng định khoản bạn đã ghi theo quy tắc: Tài sản tăng ghi Nợ / giảm ghi Có; Nguồn vốn tăng ghi Có / giảm ghi Nợ chưa?',
          'Các tài khoản doanh thu (Loại 5, 7) phát sinh tăng ghi Có; các tài khoản chi phí (Loại 6, 8) phát sinh tăng ghi Nợ đã được áp dụng đúng chưa?',
          'Tổng số tiền bên Nợ đã khớp bằng 100% tổng số tiền bên Có chưa?',
        ],
      },
      {
        level: 3,
        title: 'Nấc 3: Mẫu Tương Tự (Nghiệp Vụ Song Sinh)',
        content:
          'Một nghiệp vụ kinh điển thể hiện mối quan hệ biến động đồng thời giữa Tài sản và Nguồn vốn:',
        twinCase: {
          scenario:
            'Doanh nghiệp vay ngắn hạn ngân hàng thương mại số tiền 50.000.000 VNĐ để thanh toán trực tiếp khoản nợ mua hàng cho nhà cung cấp.',
          sampleJournal: [
            {
              accountCode: '331',
              accountName: 'Phải trả cho người bán',
              debit: 50000000,
              credit: 0,
            },
            {
              accountCode: '3411',
              accountName: 'Các khoản đi vay ngắn hạn',
              debit: 0,
              credit: 50000000,
            },
          ],
          explanation:
            'Đây là quan hệ đối ứng nội bộ Nguồn vốn (Giảm Nợ phải trả 331 ghi Nợ, Tăng Nợ vay 3411 ghi Có). Dù bất kỳ nghiệp vụ nào, tính cân bằng tổng Nợ = tổng Có luôn luôn được bảo toàn tuyệt đối.',
        },
      },
    ],
  },
};

/**
 * Get the full 3-tier Socratic hints for a given scenario
 */
export function getHintsForScenario(scenarioId: string): ScenarioHints | undefined {
  return SCENARIO_HINTS[scenarioId];
}

/**
 * Get a specific hint level (1, 2, or 3) for a given scenario
 */
export function getHintByLevel(
  scenarioId: string,
  level: 1 | 2 | 3
): SocraticHint | undefined {
  const scenarioHints = SCENARIO_HINTS[scenarioId];
  if (!scenarioHints) return undefined;
  return scenarioHints.hints.find((h) => h.level === level);
}

/**
 * Get all available scenario hints
 */
export function getAllScenarioHints(): Record<string, ScenarioHints> {
  return SCENARIO_HINTS;
}
