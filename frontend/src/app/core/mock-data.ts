import { KnowledgeSection, ReportTableOption } from './models';

export const reportTableOptions: ReportTableOption[] = [
  {
    key: 'users',
    label: 'Bảng người dùng',
    description: 'Đang nối trực tiếp với Jasper endpoint `/api/reports/users/*`.',
    available: true,
    columns: [
      { key: 'userId', label: 'User ID', description: 'Định danh user trong hệ thống.' },
      { key: 'username', label: 'Username', description: 'Tên đăng nhập.' },
      { key: 'email', label: 'Email', description: 'Email liên hệ.' },
      { key: 'firstName', label: 'First name', description: 'Tên.' },
      { key: 'lastName', label: 'Last name', description: 'Họ.' },
      { key: 'status', label: 'Status', description: 'Trạng thái tài khoản.' }
    ]
  },
  {
    key: 'stories',
    label: 'Bảng truyện',
    description: 'UI đã sẵn sàng, backend Jasper cho bảng truyện hiện chưa có endpoint riêng.',
    available: true,
    columns: [
      { key: 'id', label: 'Story ID', description: 'Mã truyện.' },
      { key: 'title', label: 'Tiêu đề', description: 'Tên truyện.' },
      { key: 'content', label: 'Nội dung', description: 'Nội dung truyện.' },
      { key: 'status', label: 'Trạng thái', description: 'Pending, published, rejected.' },
      { key: 'createdBy', label: 'Người tạo', description: 'User tạo truyện.' }
    ]
  },
  {
    key: 'workflow',
    label: 'Bảng workflow',
    description: 'Dùng để mô tả log Camunda; cần API báo cáo riêng nếu muốn xuất thật.',
    available: true,
    columns: [
      { key: 'id', label: 'Task ID', description: 'Mã task BPMN.' },
      { key: 'name', label: 'Tên task', description: 'Tên task.' },
      { key: 'description', label: 'Mô tả', description: 'Mô tả task.' },
      { key: 'assignee', label: 'Assignee', description: 'Người xử lý.' },
      { key: 'createTime', label: 'Thời gian tạo', description: 'Thời gian tạo task.' },
      { key: 'dueDate', label: 'Hạn chót', description: 'Hạn chót task.' },
      { key: 'priority', label: 'Độ ưu tiên', description: 'Độ ưu tiên task.' },
      { key: 'taskDefinitionKey', label: 'Task Key', description: 'Key định nghĩa task.' },
      { key: 'processInstanceId', label: 'Process ID', description: 'ID process instance.' }
    ]
  }
];

export const knowledgeSections: KnowledgeSection[] = [
  {
    id: 'keycloak',
    title: 'Keycloak',
    summary: 'SSO gateway cho Angular và Spring Boot, hỗ trợ realm, client, role, token exchange và custom user provider.',
    bullets: [
      'Đóng vai trò Identity Provider để quản lý đăng nhập, token và phân quyền theo realm/client role.',
      'Angular lấy access token, lưu session cục bộ và gửi Bearer token cho Spring Boot.',
      'Custom Provider cho phép đọc user từ PostgreSQL nội bộ hoặc remote federation qua REST.'
    ],
    apiNotes: [
      'OIDC token endpoint để login và refresh token.',
      'Admin API để quản lý user, role mapping, reset password, execute actions email.',
      'User Storage SPI để tích hợp custom database và remote user federation.'
    ],
    sampleNotes: [
      'Provider zip của bạn đang dùng `UserStorageProviderFactory` với id `remote-user-provider`.',
      'Provider validate user qua `/api/auth/validate` và CRUD user qua `/api/users/*`.'
    ],
    diagram: [
      {
        label: 'Frontend',
        nodes: [
          { title: 'Angular Login UI', subtitle: 'Form login, register, forgot password' },
          { title: 'Local Session', subtitle: 'JWT, role-based routes, token refresh strategy' }
        ]
      },
      {
        label: 'Identity',
        nodes: [
          { title: 'Keycloak Realm', subtitle: 'OIDC, SSO, built-in admin APIs' },
          { title: 'Custom Provider', subtitle: 'Remote federation + user provider DB' }
        ]
      },
      {
        label: 'Backend',
        nodes: [
          { title: 'Spring Boot API', subtitle: 'JWT validation and business endpoints' },
          { title: 'PostgreSQL', subtitle: 'Profile and training/project data' }
        ]
      }
    ]
  },
  {
    id: 'jasper',
    title: 'Jasper Report',
    summary: 'Reporting engine để xuất PDF/XLSX từ template JRXML, datasource Java bean hoặc truy vấn trực tiếp PostgreSQL.',
    bullets: [
      'Jasper Studio dùng để kéo thả layout, table, chart, parameter và compile template `.jrxml`.',
      'Spring Boot nạp template, truyền parameter cột được chọn và trả file dạng PDF/XLSX.',
      'Mẫu backend hiện có đang xuất báo cáo user với lựa chọn cột.'
    ],
    apiNotes: [
      'POST `/api/reports/users/pdf` và `/api/reports/users/xlsx` nhận danh sách cột.',
      'Có thể mở rộng datasource trực tiếp từ PostgreSQL hoặc bean collection data source.',
      'Template nên tách rõ summary, detail table, filter parameter và footer metadata.'
    ],
    sampleNotes: [
      'UI này cho phép chọn bảng, chọn cột và xuất file theo format phù hợp.',
      'Những bảng chưa có backend export được đánh dấu rõ để tránh hiểu nhầm.'
    ],
    diagram: [
      {
        label: 'Request',
        nodes: [
          { title: 'Angular Report Builder', subtitle: 'Chọn bảng, cột, định dạng' },
          { title: 'REST Export API', subtitle: 'Gửi selected columns lên Spring Boot' }
        ]
      },
      {
        label: 'Report Engine',
        nodes: [
          { title: 'Spring Boot Service', subtitle: 'Compile/fill/export Jasper template' },
          { title: 'Jasper Template', subtitle: 'JRXML, parameter, dataset, styles' }
        ]
      },
      {
        label: 'Data',
        nodes: [
          { title: 'PostgreSQL', subtitle: 'Datasource hoặc joined bean data' },
          { title: 'PDF / XLSX', subtitle: 'Tệp tải xuống cho admin portal' }
        ]
      }
    ]
  },
  {
    id: 'camunda',
    title: 'Camunda',
    summary: 'BPM engine để triển khai maker-checker workflow với start process, task list, complete task và delegate/service task.',
    bullets: [
      'Phù hợp cho quy trình tạo ticket, duyệt truyện, gửi mail, approve/reject và audit trail.',
      'Camunda Modeler dùng để thiết kế BPMN với User Task, Service Task, Conditional flow và Java Delegate.',
      'Angular portal nên có hàng đợi task, detail panel, action approve/reject và timeline quy trình.'
    ],
    apiNotes: [
      'POST `/api/workflow/start` để khởi tạo business process.',
      'GET `/api/workflow/tasks` và `/api/workflow/tasks/{id}` để lấy task list và chi tiết.',
      'POST `/api/workflow/tasks/{id}/complete` để đổi trạng thái và hoàn thành task.'
    ],
    sampleNotes: [
      'Backend hiện đã có start, list, detail và complete task.',
      'Claim/change status riêng chưa có endpoint, UI sẽ ghi chú phần này.'
    ],
    diagram: [
      {
        label: 'Angular',
        nodes: [
          { title: 'Task Queue UI', subtitle: 'Author/Admin worklist'  },
          { title: 'Task Inspector', subtitle: 'Review variables and submit decision' }
        ]
      },
      {
        label: 'Spring Boot',
        nodes: [
          { title: 'Workflow API', subtitle: 'Start, detail, complete, audit' },
          { title: 'Java Delegate', subtitle: 'Save story, send email, update status' }
        ]
      },
      {
        label: 'Camunda',
        nodes: [
          { title: 'BPMN Engine', subtitle: 'User Task, Service Task, Conditional flow' },
          { title: 'History / Audit', subtitle: 'Business traceability' }
        ]
      }
    ]
  }
];
