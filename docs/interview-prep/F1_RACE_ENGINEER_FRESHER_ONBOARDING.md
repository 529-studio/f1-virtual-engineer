# F1 Race Engineer — Lộ trình đọc source cho Fresher Java 8

> Đối tượng: fresher quen JDK 1.8 và kiến trúc n-tier, chưa quen Python, FastAPI, Next.js, Celery, Redis và RabbitMQ.
>
> Mục tiêu: hiểu dự án sớm nhưng vẫn đủ sâu để lần request, giải thích lỗi và thiết kế lại một flow bằng Spring Boot.
>
> Tài liệu tra cứu source chi tiết: [F1_RACE_ENGINEER_SOURCE_DEFENSE.md](./F1_RACE_ENGINEER_SOURCE_DEFENSE.md).

## 1. Nên bắt đầu từ đâu?

Cách nhanh nhất để hiểu sâu dự án là đi theo **một request thật từ giao diện đến dữ liệu và quay lại giao diện**.

Với background n-tier, hãy liên tục quy đổi source hiện tại sang mô hình quen thuộc:

| Thành phần trong dự án | Cách nghĩ theo Java/Spring |
| --- | --- |
| FastAPI route | `@RestController` |
| Pydantic model | Request/response DTO + Bean Validation |
| `Depends(...)` | Dependency injection hoặc Spring Security filter/principal |
| Agent/helper function | `@Service` hoặc domain service |
| Persistence helper | Repository hoặc external gateway |
| FastF1 | External data gateway |
| Celery task | Message consumer, gần với `@RabbitListener` |
| RabbitMQ | Message broker |
| Redis helper | Cache, idempotency hoặc temporary state service |
| Supabase | PostgreSQL và API truy cập persistence |
| Gemini wrapper | External LLM client |
| pytest | JUnit + Mockito |

Trong ngày đầu, chỉ cần trả lời được sáu câu:

1. Người dùng gửi request ở đâu?
2. Endpoint nào nhận request?
3. DTO nào validate input?
4. Business logic nằm ở đâu?
5. Dữ liệu lấy từ đâu?
6. Response quay lại giao diện như thế nào?

Sau đó tự vẽ được bản đồ tối thiểu:

```text
Browser
  → Next.js
  → FastAPI
  → Race Engineer agent
  → FastF1 / Strategy / BM25 / Gemini
  → FastAPI response
  → Next.js state và UI
```

Đối với nhánh xử lý background:

```text
FastAPI
  → RabbitMQ
  → Celery worker
  → Gemini
  → Supabase
  → Frontend polling
```

## 2. Flow đầu tiên cần đọc: Mission Control SSE

Đây là đường chạy chính mà giao diện Mission Control sử dụng khi stream hoạt động:

```text
Click Analyze
→ page.tsx
→ useAnalyzeStream
→ POST /analyze/stream
→ AnalyzeRequest
→ analyze_race_data_stream
→ analyze_query
→ LangGraph
→ FastF1 / strategy / BM25 / Gemini
→ SSE done event
→ frontend state
```

### Thứ tự file cần đọc

#### Bước 1 — Frontend trigger

Mở `frontend/src/app/mission-control/page.tsx`.

Tìm:

- `handleAnalyze`;
- `runAnalyze`;
- vị trí tạo query và request payload;
- vị trí nhận kết quả rồi cập nhật state.

Chỉ cần trả lời:

```text
Người dùng bấm gì?
Payload gồm field nào?
Function nào được gọi tiếp?
Kết quả được đặt vào state nào?
```

#### Bước 2 — Frontend HTTP/SSE client

Mở `frontend/src/hooks/useAnalyzeStream.ts` và tìm `runStream`.

Xác định:

- URL: `/analyze/stream`;
- method: `POST`;
- header `Content-Type: application/json`;
- optional `Authorization: Bearer ...`;
- `JSON.stringify(payload)`;
- `AbortController` và timeout;
- cách parse các event `status`, `telemetry`, `strategy`, `token`, `done`, `error`;
- fallback sang regular `/analyze` nếu stream lỗi.

Điểm cần nhớ: SSE stream là kết nối HTTP kéo dài. Nó không đồng nghĩa với Celery hoặc live telemetry.

#### Bước 3 — Request và response DTO

Mở `backend/app/schemas/analyze.py`.

Đọc:

- `AnalyzeRequest`;
- `SessionInfo`;
- `AnalyzeResponse`;
- các model con của response.

Hãy coi đây là contract tương đương Java:

```java
public class AnalyzeRequest {
    @NotBlank
    private String query;

    private String driver;
    private SessionInfo sessionInfo;
}
```

Type hint Python không tự động có nghĩa là mọi dữ liệu trong chương trình đều an toàn. Pydantic mới thực hiện parse và validate ở runtime tại API boundary.

#### Bước 4 — FastAPI controller

Mở `backend/app/main.py` và tìm `analyze_race_data_stream`.

Xác định:

- decorator `@app.post("/analyze/stream")`;
- Pydantic request body;
- dependency lấy optional user;
- rate limit;
- `asyncio.to_thread` dùng để chạy agent blocking ngoài event loop;
- `StreamingResponse`;
- cách tạo và gửi SSE event;
- persistence chạy fire-and-forget khi có user.

Map sang Spring:

```java
@PostMapping("/analyze/stream")
public SseEmitter analyze(@Valid @RequestBody AnalyzeRequest request,
                          Principal principal) {
    // Submit bounded work and emit progress events.
}
```

#### Bước 5 — Service orchestration

Mở `backend/agents/race_engineer.py` và tìm `analyze_query`.

Theo graph:

```text
parse intent
→ resolve context
→ run analysis
→ format response
```

Đừng coi agent là một “AI box” duy nhất. Nó là orchestration layer gọi các helper khác nhau theo intent.

## 3. Mẫu ghi chú bắt buộc cho mỗi function

Với mỗi function quan trọng, chỉ ghi bảy dòng:

```text
Function:
Called by:
Input:
Output:
Side effects:
Can fail because:
Java equivalent:
```

Ví dụ:

```text
Function: analyze_race_data_stream
Called by: POST /analyze/stream
Input: AnalyzeRequest và optional user ID
Output: StreamingResponse
Side effects: có thể lưu analysis history
Can fail because: agent, FastF1, Gemini hoặc client disconnect
Java equivalent: @PostMapping + SseEmitter
```

Một source tree lớn sẽ dễ hiểu hơn khi mỗi function được biến thành một contract nhỏ như vậy.

## 4. Sau HTTP flow: tách framework khỏi business logic

Tiếp theo đọc:

- `backend/tools/fastf1_helper.py`;
- `backend/tools/strategy_helper.py`.

Không cần hiểu toàn bộ Pandas hoặc Python ngay. Hãy trả lời:

```text
Input domain là gì?
Dữ liệu thô có hình dạng gì?
Dữ liệu được normalize thành gì?
Công thức nào tạo pit window?
Constant nào ảnh hưởng kết quả?
Fallback khi thiếu dữ liệu là gì?
```

### Điều phải hiểu chính xác

- FastF1 tải session data theo request hoặc đọc cache; repository không có live timing subscriber riêng.
- FastF1 thường trả Pandas DataFrame; helper biến dữ liệu cần thiết thành dictionary nhỏ hơn.
- Strategy là heuristic bằng công thức và `if/elif`, không phải machine-learning model đã train.
- Gemini chủ yếu diễn đạt kết quả; nó không trực tiếp tạo pit window trong flow chính.
- Không phải mọi kênh speed, throttle, gear đều được dùng để tính pit window.

Sau khi hiểu một function, thử viết lại trách nhiệm của nó bằng Java 8:

```java
public PitWindow recommend(TyreFeatures features) {
    double wear = features.getLapDecay()
        + 0.05 * features.getStintProgress()
        + 0.02 * features.getTemperatureTrend();

    // Chọn tier và chuyển wear estimate thành pit window.
    return selectWindow(wear, features.getRaceLaps());
}
```

Nếu có thể viết lại mà không nhìn Python, bạn đã bắt đầu hiểu business logic thay vì chỉ nhận diện syntax.

## 5. Học Python theo đúng flow đang đọc

Các syntax cần học trước:

- `import` và module;
- `def`, parameter và `return`;
- `if`, `elif`, `else`;
- `list`, `dict`, `tuple`, `set`;
- vòng `for`;
- comprehension;
- `try`, `except`, `finally`;
- decorator `@...`;
- `None`;
- type hint;
- `async` và `await`;
- Pydantic `BaseModel`;
- context manager `with`.

Ví dụ:

```python
def analyze(query: str) -> dict[str, object]:
    return {"query": query, "status": "success"}
```

Cách hiểu theo Java:

```java
Map<String, Object> analyze(String query) {
    Map<String, Object> result = new HashMap<String, Object>();
    result.put("query", query);
    result.put("status", "success");
    return result;
}
```

Mỗi lần gặp syntax lạ:

1. Viết lại nó bằng tiếng Việt.
2. Xác định kiểu input/output thực tế.
3. Map nó sang Java 8.
4. Tìm test đang sử dụng behavior đó.

## 6. Sau sync flow: học async flow riêng

Khi đã hiểu SSE flow, chuyển sang regular `POST /analyze`:

```text
POST /analyze
→ Pydantic validation
→ Redis idempotency
→ strategy được tính synchronously
→ insert Supabase template row
→ backfill_rationale.delay(...)
→ RabbitMQ
→ Celery worker
→ Gemini
→ conditional Supabase update
→ frontend polls history
```

### File cần đọc

1. `backend/app/main.py` — nơi gọi `.delay()`.
2. `backend/core/idempotency.py` — Redis `SET NX` và TTL.
3. `backend/tasks/__init__.py` — Celery, queue, serializer, acknowledgment.
4. `backend/tasks/rationale.py` — worker task và retry.
5. `backend/core/persistence.py` — insert/select/conditional update.
6. `frontend/src/hooks/useRationaleUpgrade.ts` — polling application history.

### Câu hỏi phải tự trả lời

- Task được tạo chính xác ở đâu?
- Ai sinh task ID?
- RabbitMQ lưu message hay lưu kết quả?
- Redis đang làm cache, idempotency hay Celery result backend?
- Supabase lưu application state nào?
- Worker chết trước acknowledgment thì chuyện gì xảy ra?
- Hai worker có thể xử lý cùng logical request không?
- Conditional update bảo vệ phần nào?
- Gemini có thể bị gọi hai lần không?
- Frontend đang poll Redis hay poll Supabase?

Câu trả lời trọng tâm:

> Database update có tính idempotent nhờ conditional PATCH chỉ update row còn `rationale_source=template`. Tuy nhiên toàn bộ task không exactly-once, vì duplicate delivery vẫn có thể gọi Gemini nhiều lần trước khi lần update thứ hai trở thành no-op.

## 7. Tiếp theo học BM25 và LLM

Đọc:

- `backend/tools/knowledge_retriever.py`;
- `backend/core/llm.py`;
- phần context construction trong `backend/agents/race_engineer.py`.

Trace theo thứ tự:

```text
Markdown corpus
→ tokenize
→ BM25 index
→ query scores
→ top-k documents
→ context dictionary
→ LLM prompt
→ Gemini text
→ template fallback
```

Phải phân biệt bốn trách nhiệm:

- BM25 tìm tài liệu có keyword phù hợp.
- Strategy helper tính recommendation.
- Gemini diễn đạt dữ kiện thành natural language.
- Pydantic kiểm tra cấu trúc; nó không chứng minh recommendation đúng.

## 8. Sau happy path: đọc failure path

Với mỗi external dependency, lập bảng:

| Dependency | Khi lỗi thì sao? | Retry | Fallback | Rủi ro |
| --- | --- | --- | --- | --- |
| FastF1 | thiếu hoặc không tải được session data | một số helper có retry | fallback/empty envelope | recommendation suy giảm |
| Gemini | exception hoặc không có text | Celery retry transient ở async path | deterministic template | duplicate cost, text kém hơn |
| Redis | cache/idempotency lỗi | không đảm bảo correctness | L1/recompute, fail-open | duplicate request, thiếu metrics |
| RabbitMQ | `.delay()` lỗi | không có outbox publisher | template row vẫn tồn tại | rationale không được upgrade |
| Supabase | insert/update lỗi | chưa có reconciliation đầy đủ | một số path swallow | history thiếu hoặc pending lâu |

Với từng dependency, trả lời thêm:

```text
Timeout nằm ở đâu?
Exception nào được retry?
Side effect có thể lặp lại không?
State nào là source of truth?
Client có biết hệ thống đang degraded không?
```

Hiểu failure path là điều chuyển kiến thức từ mức “đọc được code” sang mức “hiểu thiết kế backend”.

## 9. Dùng test như executable documentation

Thứ tự nên đọc:

1. `backend/tests/test_strategy_pit_eval.py`;
2. `backend/tests/test_rationale_task.py`;
3. `backend/tests/test_tasks_retry.py`;
4. `backend/tests/test_idempotency.py`;
5. `backend/tests/test_knowledge_retriever.py`;
6. các API tests liên quan đến flow đang học.

Với mỗi test, hỏi:

```text
Behavior nào đang được bảo vệ?
Dependency nào bị mock?
Điều gì không được test?
Test dùng real infrastructure hay fake/eager mode?
Nếu test pass thì được phép kết luận điều gì?
```

Ví dụ: Celery eager-mode test kiểm tra function/retry scaffold nhưng không chứng minh đầy đủ RabbitMQ acknowledgment, requeue hoặc worker-crash behavior.

## 10. Sau khi hiểu source: nên làm gì tiếp theo?

Chọn một bug hoặc contract nhỏ rồi thực hiện trọn chu trình:

1. Mô tả behavior mong muốn.
2. Viết failing test.
3. Reproduce lỗi.
4. Chỉ ra root cause.
5. Sửa ít nhất có thể.
6. Chạy targeted tests.
7. Giải thích failure mode và regression risk.
8. Thiết kế lại cùng behavior bằng Java/Spring Boot.

Một bài tập phù hợp trong repository là contract `rationale_text`:

```text
Celery worker ghi rationale_text
→ persistence SELECT rationale_text
→ Pydantic history response model không khai báo field
→ FastAPI serialization loại field
→ frontend không nhận được rationale đã hoàn tất
```

Bài tập này đi qua đủ các tầng quen thuộc của n-tier:

```text
Database
→ repository/gateway
→ response DTO
→ controller serialization
→ frontend API contract
```

## 11. Lộ trình hai tuần

### Tuần 1 — Hiểu hệ thống hiện tại

| Ngày | Nội dung | Kết quả phải tạo ra |
| --- | --- | --- |
| 1 | Repository map và SSE request | tự vẽ request flow |
| 2 | FastAPI, Pydantic, agent graph | map sang Controller/DTO/Service |
| 3 | FastF1 và strategy heuristic | viết pseudocode pit-window bằng Java |
| 4 | BM25, prompt và fallback | giải thích retrieval khác generation |
| 5 | Supabase persistence | vẽ bảng, state và side effects |
| 6 | Celery, RabbitMQ và Redis | vẽ async sequence và failure cases |
| 7 | Tests và failure modes | liệt kê điều được/chưa được chứng minh |

### Tuần 2 — Chứng minh mình thật sự hiểu

| Ngày | Nội dung | Kết quả phải tạo ra |
| --- | --- | --- |
| 8 | Trace lại không nhìn tài liệu | nói được flow từ trí nhớ |
| 9 | Python → Java mapping | viết lại một service bằng Java 8 |
| 10 | Easy live coding | hoàn thành exercises 1–4 |
| 11 | Medium live coding | hoàn thành exercises 5–8 |
| 12 | Distributed failure | giải thích duplicate, retry, idempotency |
| 13 | Một bug nhỏ | failing test → root cause → fix design |
| 14 | Mock interview | trả lời câu medium rồi hard có source evidence |

## 12. Thước đo “đã hiểu”

Không dùng số file đã đọc làm thước đo. Bạn hiểu một flow khi có thể:

1. Vẽ nó từ trí nhớ.
2. Chỉ đúng file, class/function và call tiếp theo.
3. Nói rõ input, output và side effect.
4. Dự đoán failure khi một dependency bị mất.
5. Viết test cho behavior quan trọng.
6. Chỉ ra điều test chưa chứng minh.
7. Thiết kế lại bằng Java/Spring mà không dịch từng dòng Python.

## 13. Checklist hằng ngày

- [ ] Hôm nay tôi trace một flow, không chỉ đọc rời rạc nhiều file.
- [ ] Mỗi function quan trọng đều có input/output/side-effect/failure note.
- [ ] Tôi map được concept mới sang Java 8 hoặc n-tier.
- [ ] Tôi tìm ít nhất một test cho behavior vừa đọc.
- [ ] Tôi ghi rõ phần nào là source-confirmed và phần nào chỉ là suy luận.
- [ ] Tôi có thể giải thích flow hôm nay trong hai phút mà không nhìn source.
- [ ] Tôi ghi lại một câu hỏi chưa trả lời và file cần kiểm tra tiếp.

## 14. Câu kết luận nên ghi nhớ

> Đọc source lớn theo chiều dọc của một request: UI → API contract → controller → service → data source → persistence → response → test → failure mode. Sau khi hiểu một flow, mới mở rộng sang flow tiếp theo. Với mỗi concept Python, map nó về Java 8/n-tier, rồi chứng minh mức hiểu bằng cách viết test hoặc thiết kế lại bằng Spring Boot.
