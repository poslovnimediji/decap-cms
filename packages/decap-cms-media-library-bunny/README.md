# Decap CMS Media Library - Bunny.net

A media library integration for [Decap CMS](https://decapcms.org/) to use [Bunny.net](https://bunny.net/) Storage as your media library.

## Features

- Browse files and folders in your Bunny Storage zone
- Upload single or multiple files
- Delete files and folders
- Image preview for supported formats
- Directory navigation with breadcrumb trail
- Client-side image filtering with `imagesOnly` support

## Installation

Install the package as a dependency in your Decap CMS project:

```bash
npm install decap-cms-media-library-bunny
# or
yarn add decap-cms-media-library-bunny
```

## Configuration

### 1. Register the plugin in your CMS config file

In your Decap CMS setup file (usually `admin/index.js` or `admin.ts`):

```javascript
import DecapCMS from 'decap-cms-app';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

DecapCMS.registerMediaLibrary(BunnyMediaLibrary);
```

### 2. Add media library configuration to `config.yml`

```yaml
media_library:
  name: bunny
  config:
    storage_zone_name: your-storage-zone-name
    api_key: your_api_key_here
    cdn_url_prefix: https://your-storage-zone.b-cdn.net
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `storage_zone_name` | String | Yes | Your Bunny Storage zone name |
| `api_key` | String | Yes | Your Bunny API key (storage zone password) |
| `cdn_url_prefix` | String | Yes | The CDN URL prefix for your storage zone |
| `root_path` | String | No | Default root path within the storage zone (default: `/`) |

## Usage

Once configured, the Decap CMS media library will display a file browser for your Bunny Storage zone. You can:

- Click on folders to navigate
- Upload files via drag-and-drop or file picker
- Select files to insert into your content
- Delete files using the delete button
- Use breadcrumbs to navigate back to parent folders

### In your collection configuration

Media files will use URLs from your Bunny Storage zone:

```yaml
collections:
  - name: blog
    label: Blog
    folder: content/blog
    create: true
    fields:
      - name: featured_image
        label: Featured Image
        widget: image
```

## Security

**Important**: Never commit your API key to version control. Consider:

- Using environment variables in your build process
- Using Decap CMS's [manual widget override](https://decapcms.org/docs/beta-features/#manual-initialization) for local config
- Using a backend proxy service to handle authentication

## Limitations (MVP Version)

- **OAuth subdirectory limitation**: Authentication currently only works for CMS deployed at domain root. For subdirectory deployments (e.g., `example.com/admin/`), users must manually navigate to the subdirectory after authentication. This is a Bunny.net OAuth limitation that has been reported to their team.
- No search functionality (coming in future versions)
- No pagination (suitable for small-to-medium numbers of files)
- Client-side only image filtering (no server-side optimization)
- No image transformations (configure those via Bunny CDN)

## Future Enhancements

- Full-text search across file names
- Pagination for large folders
- Image transformation options
- Batch operations (delete multiple files)
- Folder creation from UI
- Integration with Bunny CDN features

## License

MIT
