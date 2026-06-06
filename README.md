# PBL5 Mobile

Ứng dụng chấm công và quản lý văn phòng thông minh xây dựng bằng Expo và React Native.

## Chạy dự án

```bash
npm install
npm start
```

Khi đổi biến môi trường hoặc gặp cache Metro:

```bash
npm run start:clear
```

Kiểm tra bundle Android:

```bash
npm run check:android
```

## Biến môi trường

Tạo `.env` từ `.env.example` và cấu hình địa chỉ backend:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api
```

Android Emulator có thể sử dụng `http://10.0.2.2:8000/api`.

## Cấu trúc

```text
src/
├── application/         # Điều hướng và provider cấp ứng dụng
├── core/                # API client và lưu trữ cục bộ
├── features/            # Màn hình, dịch vụ theo từng nghiệp vụ
│   ├── attendance/
│   ├── auth/
│   ├── face-recognition/
│   ├── leaves/
│   ├── organization/
│   ├── reports/
│   ├── shifts/
│   └── smart-office/
└── shared/              # Component, cấu hình, theme và utility dùng chung
```

Quy ước:

- Mã chỉ dùng cho một nghiệp vụ đặt trong `features/<feature>`.
- Thành phần dùng chung từ hai nghiệp vụ trở lên đặt trong `shared`.
- Hạ tầng truy cập API hoặc bộ nhớ đặt trong `core`.
- Điều hướng và provider toàn ứng dụng đặt trong `application`.
