# LinguaTube — Hướng dẫn bản thử nghiệm

## Mở ứng dụng

- Web: https://st4rlight3.github.io/LinguaTube/
- Android: vào https://github.com/st4rlight3/LinguaTube/releases/tag/v0.1.0-alpha.1, tải `app-debug.apk` trong Assets. Cần Android 7 trở lên.
- Đây là APK ký bằng khóa thử nghiệm, chưa phát hành trên Google Play. Chỉ cài từ nguồn mà bạn tin tưởng; không tắt các biện pháp bảo vệ của điện thoại. Nếu máy cảnh báo, kiểm tra nguồn và chữ ký trước khi tiếp tục.

## Có thể thử ngay

1. Mở **Vocabulary**, nhập từ và nghĩa, chọn **Add**.
2. Tải lại ứng dụng: từ đã thêm vẫn nằm trên thiết bị đó.
3. Chọn **Practice flashcards**, xem nghĩa và đánh giá mức độ nhớ để lên lịch ôn.
4. Dùng nút ngôn ngữ để đổi điều hướng/trang chủ Anh–Việt; một số màn hình học và cài đặt vẫn dùng tiếng Anh.

Không coi dữ liệu khách là bản sao duy nhất. Xóa dữ liệu trình duyệt, gỡ ứng dụng hoặc đổi bản APK có khóa ký khác có thể làm mất dữ liệu cục bộ. Trong **Profile**, chọn **Export guest data** để xuất JSON và kiểm tra tệp đã lưu trước khi gỡ ứng dụng. Việc tải tệp trong WebView Android chưa được thử trên thiết bị thật; bản alpha chưa có giao diện nhập lại bản sao lưu.

## Chưa dùng trực tuyến được khi chưa cấu hình

Tìm video/kênh/danh sách phát cần backend và YouTube Data API; đăng nhập/đồng bộ cần Supabase và PostgreSQL; dịch cần nhà cung cấp tương thích LibreTranslate. Bản công khai chưa được gắn các dịch vụ này. Thông báo chưa cấu hình không có nghĩa là đang có video hoặc bản dịch thật chạy phía sau.

Người triển khai cần đặt các giá trị nhạy cảm trong phần Secrets/Environment của dịch vụ, không gửi khóa vào chat hoặc đưa vào mã nguồn:

- Backend: `DATABASE_URL`, `YOUTUBE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TRANSLATION_URL`, `TRANSLATION_API_KEY`.
- `CORS_ORIGINS`: gồm `https://st4rlight3.github.io` và `https://com.st4rlight3.linguatube` (origin không có đường dẫn `/LinguaTube/`).
- Frontend/Android: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` là cấu hình công khai; tuyệt đối không dùng service-role key cho frontend.
- Đăng ký URL chuyển hướng xác thực phù hợp với web tại `https://st4rlight3.github.io/LinguaTube/`. Luồng phục hồi tài khoản trên điện thoại cần được kiểm thử thực tế; chưa chứng nhận deep link vào ứng dụng.

Sau khi cấu hình, dựng lại frontend/APK và kiểm tra cả tìm kiếm, đăng nhập, đồng bộ, dịch và giới hạn sử dụng. Xem `DEPLOYMENT.md` để biết chi tiết.

## Kiểm tra điện thoại thật

Chưa có thiết bị được kết nối để kiểm thử. Cần kiểm tra cài/mở ứng dụng, video thật, toàn màn hình, xoay máy, nút Back, chuyển nền rồi quay lại, tua theo phụ đề và lưu từ. Dùng phụ đề SRT/VTT có quyền sử dụng.

Chất lượng phát do trình phát YouTube chính thức và điều kiện thiết bị/mạng quyết định. Không cam kết 1080p/1440p/4K khi chưa quan sát được độ phân giải thực tế. Không tải luồng video hoặc lấy phụ đề trái phép.
