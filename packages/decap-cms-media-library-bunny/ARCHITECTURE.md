# Technical Architecture

This document describes the architecture and implementation details of the Bunny.net media library integration.

## Project Structure

```
packages/decap-cms-media-library-bunny/
├── src/
│   ├── index.js                      # Main entry point, implements MediaLibraryInstance
│   ├── types.ts                      # TypeScript type definitions
│   ├── api/
│   │   ├── client.ts                # BunnyClient - HTTP client for API
│   │   └── fileManager.ts           # BunnyFileManager - High-level file operations
│   ├── components/
│   │   ├── BunnyWidget.tsx       # Main widget container component
│   │   ├── FileGrid.tsx             # File grid display component
│   │   ├── FileBrowser.tsx          # Breadcrumb navigation component
│   │   └── FileUpload.tsx           # Upload with drag-and-drop component
│   └── __tests__/
│       ├── client.test.ts           # API client tests
│       └── fileManager.test.ts      # File manager tests
├── dist/                             # Build output (CommonJS + ESM)
├── package.json
├── webpack.config.js                # Webpack configuration
├── README.md                        # User documentation
├── SETUP.md                        # Setup guide
├── TESTING.md                      # Testing guide
└── ARCHITECTURE.md                 # This file
```

## Data Flow

### Initialization Flow

```
Decap CMS
  ↓
init() called with config
  ↓
Validate configuration
  ↓
Create BunnyFileManager instance
  ↓
Return MediaLibraryInstance object
  ↓
Ready for show() calls
```

### File Browsing Flow

```
User clicks image field button
  ↓
show() called on MediaLibraryInstance
  ↓
BunnyWidget renders to DOM modal
  ↓
useEffect loads files from currentPath
  ↓
BunnyFileManager.getFilesWithUrls()
  ↓
BunnyClient.listFiles() → HTTP GET to Bunny API
  ↓
Parse response, add public URLs
  ↓
FileGrid renders file list
```

### File Selection & Insertion

```
User clicks file (single or multiple)
  ↓
State updated: selectedFiles Set
  ↓
Checkbox/visual indication displayed
  ↓
User clicks "Insert" button
  ↓
onInsert(url) callback called
  ↓
URL(s) passed back to Decap CMS
  ↓
Modal closes automatically
  ↓
URL inserted into field
```

### File Upload Flow

```
User drags files to drop zone (or clicks)
  ↓
onUpload() triggered with File objects
  ↓
For each file:
  - Set isUploading state
  - BunnyFileManager.uploadFile()
  - BunnyClient.uploadFile() → HTTP PUT to Bunny API
  - Update progress
  - Add to URL list
  ↓
Reload file list
  ↓
Auto-insert if single file + single-select mode
```

## Key Components

### 1. BunnyClient (src/api/client.ts)

Low-level HTTP client for Bunny.net Storage API.

**Key Methods:**
- `listFiles(path)` - Lists files in a directory
- `uploadFile(filePath, blob)` - Uploads a file
- `deleteFile(filePath)` - Deletes a file
- `generatePublicUrl(cdnPrefix, filePath)` - Creates CDN URL

**Features:**
- Automatic `AccessKey` header injection
- Error handling with descriptive messages
- Regional endpoint support (us, eu, asia, sydney)

### 2. BunnyFileManager (src/api/fileManager.ts)

High-level file management abstraction.

**Key Methods:**
- `listFiles(path)` - Lists directory contents
- `getFilesWithUrls(path, imagesOnly)` - Lists with public URLs
- `uploadFile(filePath, blob, fileName)` - Uploads returning URL
- `deleteFile(filePath)` - Deletes file
- `filterImageFiles(files)` - Image-only filtering
- `normalizePath(path)` - Path normalization
- `getParentPath(path)` - Parent directory calculation

**Features:**
- Client-side image filtering
- URL generation with proper formatting
- Path normalization and validation

### 3. BunnyWidget (src/components/BunnyWidget.tsx)

Main React component - orchestrates all UI and logic.

**State Management:**
```typescript
currentPath: string           // Current directory
files: AddressedMediaFile[]   // Files in current directory
selectedFiles: Set<string>    // Selected file URLs
isLoading: boolean            // Loading state
error: string | null          // Error messages
uploadProgress: number        // Upload progress %
isUploading: boolean          // Uploading state
```

**Key Handlers:**
- `handleNavigate(path)` - Navigate to path
- `handleSelectFile(url)` - Toggle file selection
- `handleFileDoubleClick(file)` - Open folder or insert file
- `handleUpload(files)` - Handle file uploads
- `handleDeleteFile(path)` - Delete file with confirmation
- `handleInsertSelected()` - Insert selected files

### 4. FileGrid Component

Displays files in responsive grid layout.

**Features:**
- Auto-sorting (directories first)
- Image preview thumbnails
- File metadata (size, date)
- Checkbox/radio selection
- Delete button on hover
- Responsive grid (CSS Grid)

### 5. FileBrowser Component

Navigation breadcrumbs and controls.

**Features:**
- Breadcrumb trail to navigate
- Back button to parent directory
- Path display for reference
- Disabled state when at root

### 6. FileUpload Component

Drag-and-drop file upload interface.

**Features:**
- Drag-and-drop support
- Click to select files
- Progress bar with percentage
- Current path indicator
- Multiple file support

## API Integration

### Bunny.net Storage API Endpoints

**List Files:**
```
GET /storage-zone-name/path/
Authorization: AccessKey <api-key>
```

Response example:
```json
[
  {
    "Guid": "abc-123",
    "StorageZoneName": "zone",
    "Path": "/",
    "ObjectName": "image.jpg",
    "Length": 102400,
    "LastChanged": "2024-01-15T10:30:00Z",
    "IsDirectory": false,
    "DateCreated": "2024-01-01T00:00:00Z",
    "StorageZoneId": 12345
  }
]
```

**Upload File:**
```
PUT /storage-zone-name/path/filename.jpg
Authorization: AccessKey <api-key>
Content-Type: application/octet-stream
[binary file data]
```

**Delete File/Folder:**
```
DELETE /storage-zone-name/path/filename.jpg
Authorization: AccessKey <api-key>
```

## Type System

### Core Types (src/types.ts)

- `BunnyFile` - File metadata from API
- `AddressedMediaFile` - File with public URL
- `BunnyConfig` - Configuration object
- `MediaLibraryInstance` - Decap CMS interface

## Error Handling

Errors are caught at multiple levels:

1. **API Level** - BunnyClient validates responses
2. **Manager Level** - BunnyFileManager adds context
3. **Component Level** - BunnyWidget catches and displays
4. **UI Level** - Error messages shown to user

Error messages include:
- Human-readable descriptions
- Suggestions for fixes where applicable
- Console logging for debugging

## Security Considerations

### Credentials Handling

- API key stored in browser memory only
- Passed via headers for each request
- Never logged or exposed in console
- Use environment variables in production

### CORS

- Bunny.net allows cross-origin requests with proper headers
- No pre-flight required for simple requests
- File uploads handled via PUT with binary data

### File Access

- Files can only be accessed via authenticated requests
- Storage zone must be properly configured in Bunny.net
- CDN URLs are public (immutable after upload)

## Performance Considerations

### Optimization Techniques

1. **Lazy Loading** - Images use `loading="lazy"`
2. **Memoization** - `useMemo` for sorted file list
3. **Debouncing** - Drag interactions debounced
4. **Virtualization** - Not needed for MVP (suitable for <1000 files)

### Known Limitations

- All files loaded at once (no pagination)
- No search indexing (linear search)
- Images not transformed (use Bunny CDN for that)

### Future Improvements

- Implement pagination
- Add search with fuzzy matching
- Implement virtual listing for large folders
- Cache folder contents
- Add prefetching for navigation

## Testing Strategy

### Unit Tests

- API client HTTP handling
- File manager path manipulation
- Image filtering logic

### Integration Tests

- Widget component state management
- File operations (list, upload, delete)
- Navigation and selection

### E2E Tests

- Full user workflows
- Error scenarios
- Multiple browser compatibility

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers (iOS Safari 15+, Chrome Android)

### Polyfills Required

- `Promise` - For async operations
- Fetch API - Modern browsers only

## Build Configuration

### Webpack

- Entry: `src/index.js`
- Output: CommonJS UMD + ESM
- Transforms: Babel (ES2017 target)
- Minification: Production builds

### Babel

- Preset: `@babel/preset-typescript`
- Allows TypeScript syntax in .tsx files
- Transpiles to ES2017 (CommonJS)

## Dependencies

### Runtime

- `react` - UI framework (peer dependency)
- `react-dom/client` - React root API

### Dev

- Standard Decap CMS monorepo toolchain
- Babel for transpilation
- Jest for testing
- Webpack for bundling

## Contributing Guidelines

### Adding Features

1. Add types to `src/types.ts`
2. Implement in appropriate component
3. Add tests in `src/__tests__/`
4. Update documentation
5. Test in browser

### Code Style

- Use TypeScript/React patterns from codebase
- Inline styles for CSS (no external CSS files)
- JSDoc comments for public APIs
- Descriptive variable names

### Testing New Functionality

1. Unit test: Isolated logic
2. Integration test: Component interaction
3. E2E test: User workflow
4. Browser test: Multiple browsers

---

**For questions or discussions**, open an issue on the [Decap CMS GitHub repository](https://github.com/decaporg/decap-cms/issues).
