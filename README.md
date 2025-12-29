# Image Hosting Service

An image hosting service built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com), supporting image upload, viewing, management, and Google OAuth authentication.

## Features

- 🖼️ Image upload and management
- 🔐 Google OAuth authentication
- 🔒 Multi-layer file validation (size, type, content verification)
- 📱 Responsive design
- 🎨 Modern UI (using Tailwind CSS and Radix UI)
- ⚡ Fast image loading and caching

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth (Google OAuth)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Language**: TypeScript

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Getting Started

### Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build for Production

```bash
npm run build
npm start
```

## API Documentation

### Authentication

#### `GET /api/auth/callback`

OAuth callback handler endpoint.

**Query Parameters:**

- `code` (string): OAuth authorization code
- `next` (string, optional): Redirect path (validated to prevent open redirect)

**Behavior:**

- Exchanges authorization code for session
- Redirects to specified path or homepage on success
- Redirects to homepage on error

---

### User Information

#### `GET /api/user`

Get current logged-in user information.

**Authentication:** Not required (returns `null` if not logged in)

**Response Example:**

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "avatar": "https://...",
  "name": "User Name"
}
```

---

### Image Management

#### `GET /api/images`

Get all images list.

**Authentication:** Not required

**Response Example:**

```json
[
  {
    "id": "abc123",
    "filename": "image.jpg",
    "mime_type": "image/jpeg",
    "size": 123456,
    "storage_path": "abc123.jpg",
    "user_id": "user-uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Sorting:** Ordered by `created_at` descending

---

#### `POST /api/images`

Upload an image.

**Authentication:** Required (401 Unauthorized)

**Request Format:** `multipart/form-data`

- `file` (File): Image file

**Validation Rules:**

- File size: Maximum 10MB
- File types: Only `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml` allowed
- Content validation: Uses magic bytes to verify actual file type

**Success Response (200):**

```json
{
  "id": "abc123",
  "url": "/abc123",
  "publicUrl": "https://supabase-storage-url/..."
}
```

**Error Responses:**

- `400`: File validation failed
- `401`: Unauthorized
- `500`: Server error

---

#### `GET /api/images/[id]`

Get a single image file (proxy download).

**Path Parameters:**

- `id` (string): Image ID (6 characters)

**Authentication:** Not required

**Response:**

- Success: Image binary content
- Headers:
  - `Content-Type`: Image MIME type
  - `Cache-Control`: `public, max-age=31536000, immutable`
  - `Content-Disposition`: `inline; filename="..."`

**Errors:**

- `404`: Image not found
- `500`: Download failed

---

#### `DELETE /api/images/[id]`

Delete an image.

**Path Parameters:**

- `id` (string): Image ID

**Authentication:** Required (401 Unauthorized)

**Permission Check:** Can only delete own uploaded images (403 Forbidden)

**Success Response (200):**

```json
{
  "success": true
}
```

**Error Responses:**

- `401`: Unauthorized
- `403`: Forbidden (not owner)
- `404`: Image not found
- `500`: Delete failed

---

#### `GET /[id]`

Direct image view (same functionality as `/api/images/[id]`).

**Path Parameters:**

- `id` (string): Image ID

**Behavior:** Returns image content for direct embedding or display

---

## Usage Examples

### Upload Image

```typescript
const formData = new FormData();
formData.append("file", imageFile);

const response = await fetch("/api/images", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log(data.id, data.url);
```

### Get User Information

```typescript
const user = await fetch("/api/user").then((r) => r.json());
if (user) {
  console.log(user.email, user.name);
}
```

### Get Images List

```typescript
const images = await fetch("/api/images").then((r) => r.json());
console.log(images);
```

### Delete Image

```typescript
await fetch("/api/images/abc123", {
  method: "DELETE",
});
```
