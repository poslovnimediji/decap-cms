# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-19

### Added

- Initial release of Bunny.net media library integration for Decap CMS
- File browsing and navigation with breadcrumb trail
- Single and multiple file selection
- File upload with drag-and-drop support
- File deletion with confirmation
- Image preview thumbnails
- Client-side image filtering for image widgets
- Responsive UI that works on desktop and mobile
- Comprehensive documentation (Setup, Testing, Architecture guides)
- Unit tests for API client and file manager
- TypeScript type definitions
- CommonJS and ESM builds

### Features (MVP)

- **File Browsing**: Navigate storage zone directories with breadcrumbs
- **File Selection**: Single or multiple file selection mode
- **File Upload**: Drag-and-drop or click-to-upload with progress tracking
- **File Deletion**: Delete files with confirmation dialog
- **Image Filtering**: Automatic filtering to images when using image widget
- **Public URLs**: Automatic CDN URL generation for inserted files
- **Error Handling**: User-friendly error messages and recovery

### Limitations (Future Enhancements)

- No full-text search (filename sorting only)
- No pagination (loads all files in folder at once)
- No image transformations (use Bunny CDN separately)
- No folder creation from UI
- No batch operations (delete multiple, etc)

### Documentation

- `README.md` - User documentation and feature list
- `SETUP.md` - Step-by-step setup guide with examples
- `TESTING.md` - Testing procedures and test scenarios
- `ARCHITECTURE.md` - Technical architecture and code organization

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Mobile browsers

### Known Issues

None

---

## Planned for Future Releases

### 0.2.0

- [ ] Full-text search across file names
- [ ] Pagination for large folders
- [ ] Cached file listings
- [ ] Folder creation from UI
- [ ] Batch delete operations

### 0.3.0

- [ ] Image transformation options (resize, crop, etc via Bunny CDN)
- [ ] File metadata editing
- [ ] Tagging system
- [ ] Recent files section

### 1.0.0

- [ ] Stabilized API
- [ ] Full feature parity with Cloudinary (where applicable)
- [ ] Community feedback integration

---

**Contributors**: Initial implementation by Decap CMS team

**License**: MIT
