# 529 Studio Agent Protocol — F1 Virtual Engineer

> **Core Philosophy**: Khi làm bất kỳ task nào, **đừng sợ tốn sức** — hãy đào sâu, làm triệt để và giải quyết tận gốc vấn đề.

## 1. Evidence-Based DoD & Debugging
- **Pass test case là chưa đủ, phải tái hiện lỗi End-to-End**: Khi có bug, bắt buộc phải tái hiện trên môi trường chạy thực tế (browser, network trace, cURL), xác định đúng root cause trước khi code fix.
- **Evidence Before Assertions**: Không báo cáo hoàn thành khi chưa có bằng chứng thực nghiệm (live cURL output, screenshot, browser network log).

## 2. 529 Senior Skills Protocol
Tuân thủ 6 trụ cột kỹ năng từ `529-engineering-skills`:
- `resilient-networking-and-waf`: Luôn có `User-Agent` định danh, assert upstream headers.
- `env-and-auth-ops-debugging`: Cấm bare `load_dotenv()`, dùng `Path(__file__).resolve().parent...`.
- `frontend-4file-and-resilient-ui`: Chuẩn 4-file pattern, render đủ 3 trạng thái (Skeleton, Error, Empty).
- `evidence-based-dod-and-llm-guardrails`: Đọc docs nội bộ tránh trap deprecation, zero-leak secrets.

## 3. Tech Stack & Git Flow
- **Data & Backend**: FastAPI + LangGraph + Async first. Dữ liệu dùng cache local `backend/data`.
- **Frontend**: Next.js + Zustand + Apple/Automotive aesthetic.
- **Git Flow**: Làm việc trên nhánh `feature/*`, merge vào `develop`.
- **Knowledge Loop**: Ghi nhận bài học vào `lesson_learn.md` sau khi giải quyết bug phức tạp.
