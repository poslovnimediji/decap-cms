# Bunny.net Media Library Setup Guide

This guide will help you set up the Bunny.net media library integration with Decap CMS.

## Prerequisites

- Decap CMS v3.0.0 or later
- A Bunny.net account with at least one Storage Zone
- Node.js 14+

## Step-by-Step Setup

### 1. Get Your Bunny.net Credentials

1. Log in to your [Bunny.net account](https://bunny.net)
2. Navigate to **Storage** → **Storage Zones**
3. Either select an existing storage zone or create a new one
4. Note the following information:
   - **Storage Zone Name** - The name of your storage zone
   - **Storage Zone Password** - Your API key (found in Zone Settings)
   - **CDN URL** - The HTTP pull zone URL (format: `https://zonename.b-cdn.net`)

### 2. Install the Package

```bash
npm install decap-cms-media-library-bunny
# or
yarn add decap-cms-media-library-bunny
```

### 3. Register the Plugin

In your Decap CMS admin configuration file (usually `admin/index.js` or `admin.ts`):

```javascript
import DecapCMS from 'decap-cms-app';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

// Register the media library
DecapCMS.registerMediaLibrary(BunnyMediaLibrary);

// Initialize Decap CMS
DecapCMS.init();
```

### 4. Configure in config.yml

Add the media library configuration to your Decap CMS `config.yml`:

```yaml
media_library:
  name: bunny
  config:
    storage_zone_name: your-storage-zone-name
    api_key: your_storage_zone_password
    cdn_url_prefix: https://your-storage-zone.b-cdn.net
    root_path: /  # Optional: default root folder for uploads
```

### 5. (Optional) Environment Variables

For security, use environment variables instead of hardcoding credentials:

**In your build process:**

```javascript
media_library:
  name: bunny
  config:
    storage_zone_name: ${BUNNY_STORAGE_ZONE}
    api_key: ${BUNNY_API_KEY}
    cdn_url_prefix: ${BUNNY_CDN_URL}
```

**Set environment variables in your CI/CD:**

```bash
export BUNNY_STORAGE_ZONE="your-zone-name"
export BUNNY_API_KEY="your-api-key"
export BUNNY_CDN_URL="https://your-zone.b-cdn.net"
```

## Usage

Once configured, the media library will be available in your Decap CMS editor:

### In Collection Fields

```yaml
collections:
  - name: blog
    label: Blog
    folder: content/blog
    fields:
      - name: featured_image
        label: Featured Image
        widget: image
        
      - name: gallery
        label: Image Gallery
        widget: list
        fields:
          - name: image
            label: Image
            widget: image
```

### Managing Files

**Navigate:** Click breadcrumbs or use the Back button to navigate folders

**Upload:** Drag files into the drop zone or click to select

**Delete:** Hover over a file and click the 🗑️ button

**Select:** Click files to select (single) or check multiple files (if supported)

**Insert:** Click the "Insert" button to add selected files to your field

## Advanced Configuration

### Setting a Default Upload Directory

```yaml
media_library:
  name: bunny
  config:
    storage_zone_name: my-zone
    api_key: my-api-key
    cdn_url_prefix: https://my-zone.b-cdn.net
    root_path: /blog/images/  # All uploads go here
```

### Image Filtering

The media library automatically filters to show only images when used with the `image` widget:

- Supported formats: jpg, jpeg, png, gif, webp, svg, ico, bmp
- When `image` widget is used, only images are shown
- When used with generic properties, all files are shown

## Troubleshooting

### "API Key Invalid" Error

- Verify your `storage_zone_name` matches exactly in Bunny.net
- Check your `api_key` is the **Storage Zone Password**, not the API Key
- Ensure credentials are correctly set in environment variables

### "Failed to Load Files" Error

- Verify network connectivity to Bunny.net
- Check that your storage zone exists and is active
- Ensure CORS is properly configured (Bunny.net allows cross-origin requests with proper headers)

### Slow File Loading

- This is normal for storage zones with many files
- Consider limiting number of files in a folder
- Or create subdirectories to organize content

### Images Not Displaying in Preview

- Verify your CDN URL is accessible from your network
- Check that the CDN pull zone is properly configured
- Ensure files are uploaded to the correct storage zone

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive information
3. **Restrict storage zone access** in Bunny.net account settings
4. **Use a dedicated storage zone** for CMS media
5. **Enable CDN caching** for better performance

## Performance Tips

- Keep folder structures organized (splits load)
- Use descriptive file names (aids in searching/sorting)
- Archive old files to separate storage zones
- Enable Bunny CDN for fast global access

## Limitations (MVP)

- No full-text search (filename sorting only)
- No pagination (loads all files at once)
- No image transformations (use Bunny CDN for that)
- No folder creation from UI
- No batch operations

## Next Steps

- See [README.md](./README.md) for feature list and limitations
- Check [Bunny.net API Docs](https://docs.bunny.net/reference/storage-api) for API details
- Report issues on [GitHub Issues](https://github.com/decaporg/decap-cms/issues)

## Support

For issues or questions:

1. Check this troubleshooting guide
2. Review Bunny.net documentation at https://docs.bunny.net
3. Open an issue on the Decap CMS GitHub repository

---

**Enjoy managing your media library with Bunny.net!**
