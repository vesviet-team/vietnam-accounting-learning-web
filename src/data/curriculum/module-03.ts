import { DailyLesson } from '@/types/curriculum';

export const MODULE_3_LESSONS: DailyLesson[] = [
  {
    day: 7,
    moduleNumber: 3,
    moduleTitleVi: 'Khối 3: Mua Hàng, Hàng Tồn Kho & Luật Thanh Toán Không Dùng Tiền Mặt',
    dayTitleVi: 'Ngày 7: Chu Trình Mua Hàng & Kế Toán Phải Trả Người Bán (TK 331 - Lưỡng Tính)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c7-1',
        titleVi: 'Bản Chất Chu Trình Mua Hàng & Bộ Chứng Từ Đầu Vào',
        summaryVi: 'Chu trình mua hàng gồm Đơn đặt hàng (PO), Phiếu giao hàng, Phiếu nhập kho (01-VT) và Hóa đơn GTGT.',
        contentVi: 'Chu trình mua sắm bắt đầu từ nhu cầu vật tư của các phòng ban -> Lập Đơn đặt hàng (PO) ký kết hợp đồng kinh tế -> Nhà cung cấp giao hàng -> Bộ phận kho kiểm đếm lập Phiếu nhập kho (Mẫu 01-VT) -> Nhận Hóa đơn GTGT điện tử. Kế toán công nợ tập hợp toàn bộ hồ sơ này làm căn cứ ghi nhận nợ phải trả TK 331.',
        keyTakeawayVi: 'Hồ sơ mua hàng đầy đủ gồm Hợp đồng, PO, Biên bản giao nhận, Phiếu nhập kho và Hóa đơn GTGT.',
      },
      {
        id: 'c7-2',
        titleVi: 'Đặc Tính Lưỡng Tính Của Tài Khoản 331 (Phải Trả Cho Người Bán)',
        summaryVi: 'TK 331 vừa có thể có số dư Có (còn nợ người bán), vừa có thể có số dư Nợ (ứng trước tiền cho người bán).',
        contentVi: 'TK 331 là tài khoản công nợ lưỡng tính. Dư CÓ phản ánh số tiền doanh nghiệp còn phải trả người bán (trình bày bên phần Nợ phải trả trên Bảng CĐKT). Dư NỢ phản ánh số tiền doanh nghiệp đã ứng trước cho người bán nhưng chưa nhận hàng (trình bày bên phần Tài sản ngắn hạn trên Bảng CĐKT). NGUYÊN TẮC CẤM: Khi lập Báo cáo tài chính, kế toán tuyệt đối không được bù trừ số dư Nợ của người bán này với số dư Có của người bán khác.',
        detailedTAccounts: [
          {
            accountCode: '331',
            accountNameVi: 'Phải trả cho người bán',
            accountClass: 3,
            normalBalance: 'BOTH',
            openingBalance: { side: 'CREDIT', amount: 80000000 },
            entries: [
              { id: 'cn1', description: 'Mua NVL nhập kho chưa trả tiền (HĐ 00124)', amount: 66000000, side: 'CREDIT', counterAccountCode: '152' },
              { id: 'cn2', description: 'Chuyển khoản UNC thanh toán nợ cũ', amount: 80000000, side: 'DEBIT', counterAccountCode: '112' },
              { id: 'cn3', description: 'Ứng trước tiền cho NCC Máy tính Tân Phát', amount: 20000000, side: 'DEBIT', counterAccountCode: '112' },
            ],
            explanationVi: 'Số dư cuối kỳ chi tiết: Nhà cung cấp A còn phải trả 66.000.000đ (Dư Có); Nhà cung cấp Tân Phát được ứng trước 20.000.000đ (Dư Nợ). Phải trình bày riêng biệt cả hai bên trên BCTC.',
          },
        ],
        keyTakeawayVi: 'Tài khoản 331 có tính lưỡng tính; cấm bù trừ số dư giữa các đối tượng công nợ khác nhau trên BCTC.',
      },
      {
        id: 'c7-3',
        titleVi: 'Bút Toán Mua Hàng Hóa, Nguyên Vật Liệu Nhập Kho Chưa Thanh Toán',
        summaryVi: 'Ghi tăng giá trị hàng tồn kho (152/156), thuế GTGT được khấu trừ (1331) và nợ người bán (331).',
        contentVi: 'Khi nhận hàng và hóa đơn GTGT: Nợ TK 152 / TK 156 (Giá mua chưa thuế GTGT); Nợ TK 1331 (Thuế GTGT đầu vào được khấu trừ); Có TK 331 (Tổng giá trị thanh toán bao gồm VAT). Nếu được hưởng chiết khấu thanh toán do trả nợ sớm: Ghi Nợ TK 331 / Có TK 515 (Doanh thu tài chính), không làm giảm giá gốc hàng mua.',
        journalExamples: [
          {
            descriptionVi: 'Mua nguyên vật liệu nhập kho chưa trả tiền người bán theo HĐ GTGT 10%',
            entries: [
              { debitCredit: 'DEBIT', accountCode: '152', accountNameVi: 'Nguyên liệu, vật liệu', amount: 60000000 },
              { debitCredit: 'DEBIT', accountCode: '1331', accountNameVi: 'Thuế GTGT đầu vào được khấu trừ', amount: 6000000 },
              { debitCredit: 'CREDIT', accountCode: '331', accountNameVi: 'Phải trả cho người bán', amount: 66000000 },
            ],
            statutoryNoteVi: 'Hóa đơn tổng thanh toán 66 triệu bắt buộc phải thanh toán bằng chuyển khoản để được khấu trừ 6 triệu tiền thuế GTGT.',
          },
        ],
        keyTakeawayVi: 'Thuế GTGT đầu vào hạch toán vào TK 1331; chiết khấu thanh toán hưởng do trả tiền sớm ghi vào Có TK 515.',
      },
    ],
  },
  {
    day: 8,
    moduleNumber: 3,
    moduleTitleVi: 'Khối 3: Mua Hàng, Hàng Tồn Kho & Luật Thanh Toán Không Dùng Tiền Mặt',
    dayTitleVi: 'Ngày 8: Quy Tắc Bắt Buộc Thanh Toán Không Dùng Tiền Mặt >= 20 Triệu Đồng (TT 219/2013)',
    estimatedMinutes: 20,
    isMilestoneDay: false,
    concepts: [
      {
        id: 'c8-1',
        titleVi: 'Căn Cứ Pháp Lý & Ngưỡng 20 Triệu Đồng (Đã Gồm Thuế GTGT)',
        summaryVi: 'Hóa đơn từ 20.000.000 VNĐ trở lên bắt buộc phải chuyển khoản ngân hàng từ tài khoản người mua sang người bán.',
        contentVi: 'Theo Điều 15 Thông tư 219/2013/TT-BTC (sửa đổi bởi TT 173/2016/TT-BTC) và Điều 4 Thông tư 96/2015/TT-BTC: Hóa đơn mua hàng từng lần có giá trị từ 20 triệu đồng trở lên (đã bao gồm thuế GTGT) bắt buộc phải có chứng từ thanh toán không dùng tiền mặt (chuyển khoản từ tài khoản công ty mua sang tài khoản công ty bán đã đăng ký với cơ quan thuế) mới đủ điều kiện khấu trừ thuế GTGT và tính chi phí được trừ khi tính thuế TNDN.',
        keyTakeawayVi: 'Ngưỡng 20 triệu đồng tính trên TỔNG GIÁ THANH TOÁN (đã có thuế GTGT), không phải giá trước thuế.',
      },
      {
        id: 'c8-2',
        titleVi: 'Cạm Bẫy Phổ Biến: Nộp Tiền Mặt Tại Quầy Ngân Hàng Vào Tài Khoản Bên Bán',
        summaryVi: 'Hành vi nộp tiền mặt vào tài khoản bên bán không được coi là thanh toán không dùng tiền mặt và bị loại trừ 100%.',
        contentVi: 'Rất nhiều doanh nghiệp mắc sai lầm: Giám đốc cử nhân viên mang 50 triệu tiền mặt ra chi nhánh ngân hàng của bên bán và nộp trực tiếp vào tài khoản của bên bán (lấy Giấy nộp tiền). Cơ quan thuế khẳng định: Đây là thanh toán bằng TIỀN MẶT vì dòng tiền không bắt nguồn từ tài khoản ngân hàng của người mua. Hậu quả: Toàn bộ thuế GTGT đầu vào bị truy thu, và chi phí mua hàng bị gạt bỏ khỏi chi phí hợp lý tại Chỉ tiêu B4 trên Tờ khai Quyết toán thuế TNDN!',
        keyTakeawayVi: 'Tiền phải chuyển từ tài khoản công ty mua sang tài khoản công ty bán; nộp tiền mặt tại quầy là phạm luật.',
      },
      {
        id: 'c8-3',
        titleVi: 'Quy Tắc Gộp Nhiều Hóa Đơn Mua Cùng Ngày Từ Một Nhà Cung Cấp',
        summaryVi: 'Nhiều hóa đơn dưới 20 triệu mua cùng 1 ngày từ 1 người bán có tổng >= 20 triệu vẫn bắt buộc phải chuyển khoản.',
        contentVi: 'Theo Khoản 3 Điều 15 Thông tư 219/2013: Trường hợp mua hàng hóa, dịch vụ của một nhà cung cấp có giá trị dưới 20 triệu đồng nhưng mua nhiều lần trong cùng một ngày có tổng giá trị từ 20 triệu đồng trở lên thì chỉ được khấu trừ thuế đối với trường hợp có chứng từ thanh toán qua ngân hàng. Nếu thanh toán bằng tiền mặt, kế toán sẽ bị loại thuế GTGT và loại chi phí TNDN toàn bộ các hóa đơn trong ngày đó.',
        keyTakeawayVi: 'Tuyệt đối không chia nhỏ hóa đơn trong cùng một ngày để lách luật thanh toán bằng tiền mặt.',
      },
    ],
  },
  {
    day: 9,
    moduleNumber: 3,
    moduleTitleVi: 'Khối 3: Mua Hàng, Hàng Tồn Kho & Luật Thanh Toán Không Dùng Tiền Mặt',
    dayTitleVi: 'Ngày 9: Đối Soát 3 Bên (3-Way Matching), Hàng Về Chưa HĐ (GRNI) & Đi Đường (TK 151)',
    estimatedMinutes: 20,
    isMilestoneDay: true,
    concepts: [
      {
        id: 'c9-1',
        titleVi: 'Nguyên Tắc Kiểm Soát Đối Soát 3 Bên (3-Way Matching)',
        summaryVi: 'Khớp ba chứng từ: Đơn đặt hàng (PO) vs Phiếu nhập kho (GRN) vs Hóa đơn nhà cung cấp (Vendor Invoice).',
        contentVi: 'Quy trình đối soát 3 bên là chốt chặn kiểm soát nội bộ tối thượng chống thất thoát và gian lận: (1) Khớp mã hàng SKU và thông số kỹ thuật; (2) Khớp số lượng đặt hàng, số lượng thực nhập kho và số lượng lập hóa đơn; (3) Khớp đơn giá ký trên hợp đồng với đơn giá trên hóa đơn (sai lệch đơn giá phải bằng 0.00%). Chỉ khi cả 3 chứng từ trùng khớp hoàn hảo thì kế toán thanh toán mới được chuyển khoản.',
        keyTakeawayVi: 'Đơn giá trên Hóa đơn phải khớp 100% với Hợp đồng/PO; số lượng trên Hóa đơn phải khớp Phiếu nhập kho.',
      },
      {
        id: 'c9-2',
        titleVi: 'Xử Lý Hàng Về Trước Hóa Đơn Về Sau (Hàng Chưa Có Hóa Đơn - GRNI)',
        summaryVi: 'Ghi nhận giá tạm tính vào Nợ TK 152/156, Có TK 331; TUYỆT ĐỐI KHÔNG trích thuế GTGT đầu vào khi chưa có hóa đơn.',
        contentVi: 'Cuối kỳ kế toán (ngày cuối tháng), hàng đã nhập kho kiểm nghiệm đạt chất lượng nhưng nhà cung cấp chưa xuất Hóa đơn điện tử: Kế toán ghi nhận theo giá tạm tính (dựa trên hợp đồng/báo giá): Ghi Nợ TK 152, 156 / Có TK 331 (không trích Nợ 133!). Sang kỳ sau khi nhận hóa đơn chính thức: kế toán ghi bổ sung thuế GTGT Nợ TK 133 / Có TK 331 và điều chỉnh chênh lệch giữa giá tạm tính và giá thực tế hóa đơn.',
        keyTakeawayVi: 'Hàng về chưa có hóa đơn chỉ được ghi nhận giá tạm tính kho; nghiêm cấm trích thuế GTGT TK 133 khi thiếu hóa đơn hợp pháp.',
      },
      {
        id: 'c9-3',
        titleVi: 'Xử Lý Hóa Đơn Về Trước Hàng Chưa Về Kho (Hàng Mua Đang Đi Đường - TK 151)',
        summaryVi: 'Hóa đơn đã nhận và chuyển tiền nhưng hàng đang vận chuyển chưa nhập kho phản ánh vào TK 151.',
        contentVi: 'Khi kế toán nhận được Hóa đơn điện tử và đã thanh toán tiền, nhưng đến ngày khóa sổ hàng vẫn đang trên đường vận chuyển chưa cập kho: Ghi Nợ TK 151 (Hàng mua đang đi đường), Nợ TK 133 / Có TK 331, 112. Sang tháng sau khi hàng về đến kho làm thủ tục kiểm nhập: Ghi Nợ TK 152, 156 / Có TK 151.',
        vouchers: [
          {
            type: 'GOODS_RECEIPT_01_VT',
            titleVi: 'Phiếu nhập kho số PNK-015: Nhập kho hạt nhựa nguyên sinh',
            voucherNumber: 'PNK-2026-015',
            date: '2026-09-09',
            delivererName: 'Trần Đại Quang (Lái xe vận tải Hoàng Hà)',
            invoiceRef: 'HĐĐT số 0001890 ngày 08/09/2026',
            warehouseName: 'Kho Nguyên Liệu Số 1 - KCN Đình Vũ, Hải Phòng',
            warehouseLocation: 'Dãy B, Ô số 12',
            debitAccount: 'TK 152',
            creditAccount: 'TK 331',
            items: [
              { sku: 'PP-YARN-01', name: 'Hạt nhựa PP nguyên sinh Yarn Grade', unit: 'Tấn', quantityDoc: 10, quantityActual: 10, unitPrice: 28000000, amount: 280000000 },
            ],
            totalAmount: 280000000,
            signatures: {
              warehouseKeeper: 'Đặng Quốc Huy (Thủ kho)',
              deliverer: 'Trần Đại Quang',
              preparer: 'Nguyễn Thị Duyên',
              chiefAccountant: 'Lê Thu Hà (Kế toán trưởng)',
            },
          },
        ],
        keyTakeawayVi: 'Hàng đang đi đường phản ánh vào TK 151; khi nhập kho ghi chuyển từ TK 151 sang TK 152/156.',
      },
    ],
  },
];
