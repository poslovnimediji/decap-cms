# Integration Testing Guide

This guide explains how to test the Bunny.net media library integration with Decap CMS.

## Quick Start Testing

### 1. Use the Dev-Test Config

The repo includes a `dev-test` folder with a sample config. You can use it to test the integration:

```bash
# From root of decap-cms repo
cd dev-test
# Update config.yml with your Bunny.net credentials
```

### 2. Create a Test Config

Create `dev-test/config.yml`:

```yaml
backend:
  name: test

media_library:
  name: bunny
  config:
    storage_zone_name: test-zone
    api_key: your-storage-password
    cdn_url_prefix: https://test-zone.b-cdn.net

collections:
  - name: pages
    label: Pages
    folder: content
    create: true
    fields:
      - name: title
        label: Title
        widget: string
      
      - name: hero_image
        label: Hero Image
        widget: image
      
      - name: gallery
        label: Gallery
        widget: list
        fields:
          - name: image
            label: Image
            widget: image
          - name: caption
            label: Caption
            widget: string
```

### 3. Test Integration

#### Via npm workspace

```bash
# From repository root
npm run develop -w packages/decap-cms-media-library-bunny
```

This will start the package in watch mode. Then in another terminal:

```bash
npm run start
```

#### Via manual testing

1. Build the package:
```bash
npm run build -w packages/decap-cms-media-library-bunny
```

2. Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bunny.net Media Library Test</title>
  <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="admin"></div>
  
  <script src="./dist/decap-cms-app.js"></script>
  <script src="./dist/decap-cms-media-library-bunny.js"></script>
  <script>
    CMS.registerMediaLibrary(window.DecapCmsMediaLibraryBunny);
    CMS.init();
  </script>
</body>
</html>
```

## Test Scenarios

### Scenario 1: File Browsing

**Steps:**
1. Click the image field's media library button
2. Verify files load from your Bunny.net storage zone
3. Navigate folders using breadcrumbs
4. Use Back button to navigate up

**Expected:**
- ✅ Files display in grid
- ✅ File icons show for images
- ✅ File metadata (size, date) displays
- ✅ Breadcrumb navigation works
- ✅ Back button works

### Scenario 2: Single File Selection

**Steps:**
1. Open media library on image field
2. Click an image file (not double-click)
3. Verify checkbox appears and file is selected
4. Click "Insert" button

**Expected:**
- ✅ File URL inserted into field
- ✅ Image preview appears in Decap editor
- ✅ Modal closes automatically
- ✅ URL format: `https://your-zone.b-cdn.net/path/file.jpg`

### Scenario 3: Multiple File Selection

**Steps:**
1. Open media library on a list/array field
2. Select multiple images by clicking them
3. Note the counter in the "Insert" button
4. Click "Insert"

**Expected:**
- ✅ Multiple URLs inserted as array
- ✅ All selected files added to the list field
- ✅ Insert button shows count

### Scenario 4: File Upload

**Steps:**
1. Open media library
2. Drag a file into the drop zone (or click to select)
3. Wait for upload to complete
4. Verify file appears in the grid
5. Verify URL is correct

**Expected:**
- ✅ Progress bar shows upload progress
- ✅ File appears in grid after upload
- ✅ File is accessible via CDN URL
- ✅ Auto-insert on single file upload

### Scenario 5: File Deletion

**Steps:**
1. Open media library
2. Hover over a file
3. Click the 🗑️ delete button
4. Confirm deletion
5. Verify file is removed from grid

**Expected:**
- ✅ Confirmation dialog appears
- ✅ File deleted from Bunny.net
- ✅ File removed from grid
- ✅ No error messages

### Scenario 6: Image Filtering

**Steps:**
1. Create a mixed folder with images and documents
2. Open media library with image widget
3. Verify only images display
4. Open media library with generic field
5. Verify all files display

**Expected:**
- ✅ Image widget shows only .jpg, .png, .gif, .webp, .svg, .ico, .bmp files
- ✅ Generic field shows all files
- ✅ Folders always visible

### Scenario 7: Error Handling

**Steps:**
1. Set invalid API key in config
2. Try to open media library
3.Verify error message displays
4. Fix credentials
5. Retry and verify it works

**Expected:**
- ✅ Clear error messages
- ✅ No crashes
- ✅ Can try again after fixing

## Browser Compatibility Testing

Test in these browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers


## Performance Testing

### Large Folder Test

1. Create a storage zone with 1000+ files
2. Open media library
3. Measure load time and responsiveness
4. Scroll through files

**Expected:**
- ✅ Loads within reasonable time (<5s)
- ✅ Scrolling is smooth
- ✅ No memory issues

### Upload Performance Test

1. Upload a large file (>100MB)
2. Monitor progress bar
3. Verify completion and insertion

**Expected:**
- ✅ Progress bar updates smoothly
- ✅ Upload completes successfully
- ✅ File is available in CDN

## Reporting Issues

If you encounter issues, include:

1. **Browser & OS:** Which browser/OS you're testing on
2. **Steps to reproduce:** Exact steps that cause the issue
3. **Expected vs actual:** What should happen vs what happens
4. **Screenshot/video:** If applicable
5. **Console errors:** Any JavaScript errors in browser console
6. **Config:** Sanitized config.yml (redact credentials)

File issues at: https://github.com/decaporg/decap-cms/issues

---

**Thank you for testing!**
