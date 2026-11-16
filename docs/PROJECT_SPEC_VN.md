# F1 Virtual Engineer: Tài liệu Đặc tả Dự án (Agent-Ready)

## Tổng quan
**F1 Virtual Engineer** là bàn làm việc phân tích chiến thuật đua xe (race-strategy analysis workbench) đóng vai trò là Kỹ sư Đua xe Ảo. Hệ thống thực thi các mô hình chiến thuật định lượng tất định trên dữ liệu FastF1 sau chặng đua (post-session) và đưa ra các phân tích chiến thuật (thời điểm vào pit, độ mòn lốp, dự đoán undercut/overcut) kèm lập luận ngôn ngữ tự nhiên đối chiếu luật FIA.

## Kiến trúc: Cấu trúc Monorepo
Dự án được cấu trúc để tách biệt phần tư duy AI (Backend) và phần hiển thị giao diện (Frontend).

### `/backend` (FastAPI + LangGraph)
- **`app/`**: Các API endpoint và cấu hình router.
- **`agents/`**: Logic cốt lõi của Agent sử dụng LangGraph (Nodes, Edges, State).
- **`core/`**: System prompts, các chính sách điều hành và cấu hình LLM.
- **`tools/`**: Các wrapper cho FastF1 API với Pydantic schema để kiểm tra dữ liệu.
- **`rag/`**: Cơ sở dữ liệu Vector (Supabase/ChromaDB) lưu trữ luật lệ FIA và dữ liệu chiến thuật lịch sử.
- **`data/`**: Thư mục cache cục bộ cho dữ liệu telemetry từ FastF1.
- **`eval/`**: Bộ công cụ đánh giá và "Golden Sets" để kiểm tra hiệu suất của Agent.

### `/frontend` (Next.js 15 + TypeScript)
- **Dashboard**: Giao diện hiệu suất cao sử dụng Tailwind CSS để hiển thị dữ liệu viễn thám phiên chạy, so sánh kịch bản chiến thuật và phản hồi của Agent.

## Tech Stack
- **Ngôn ngữ**: Python 3.11+ (Backend), TypeScript (Frontend).
- **Điều phối Agent**: LangGraph, LangChain.
- **Trí tuệ nhân tạo**: Gemini API (Flash/Pro) để phân tích dữ liệu và lập luận.
- **Nguồn dữ liệu**: FastF1 (Dữ liệu telemetry và lịch trình lưu trữ sau chặng đua).
- **Cơ sở dữ liệu**: Supabase (PostgreSQL + Vector).
- **Giao diện**: Tailwind CSS (Phong cách đua xe chuyên nghiệp).

## Năng lực cốt lõi của Agent (Hướng dẫn cho Agent-to-Agent)
1. **Phân tích Telemetry**: Truy xuất và so sánh tốc độ, cấp số, chân ga, và phanh giữa các vòng đua/tay đua.
2. **Dự đoán chiến thuật**: Dự báo "Lap Time Decay" (sự sụt giảm thời gian vòng chạy) và đề xuất thời điểm vào pit tối ưu.
3. **Diễn giải Radio**: Phân tích các đoạn hội thoại radio để phát hiện lỗi kỹ thuật (sử dụng lập luận LLM).
4. **Mô phỏng chiến lược**: Sử dụng dữ liệu lịch sử để mô phỏng các kịch bản undercut/overcut.

## Thiết lập & Khởi chạy
1. **Backend**:
   - Cài đặt thư viện: `pip install -r backend/requirements.txt`.
   - Chạy server: `python backend/app/main.py`.
2. **Frontend**:
   - Cài đặt thư viện: `corepack enable && yarn install --immutable`.
   - Chạy dev: `yarn dev` (Port 3001).

## Tiêu chuẩn Đánh giá
- Mọi lời gọi công cụ (tool calls) phải sử dụng Pydantic schema.
- Agent phải tuân thủ quy trình làm việc: **Nghiên cứu -> Chiến thuật -> Thực thi**.
- Logic đua xe quan trọng phải được xác thực bằng bộ dữ liệu "golden sets" trong `backend/eval/`.
