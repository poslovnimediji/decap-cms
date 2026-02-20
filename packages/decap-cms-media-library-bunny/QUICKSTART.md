# Quick Start Example

This is a complete working example of how to use the Bunny.net media library with Decap CMS.

## Step 1: Install Dependencies

```bash
npm install decap-cms-app decap-cms-media-library-bunny decap-cms-backend-test
```

## Step 2: Create Admin Page

Create `public/admin/index.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Content Manager</title>
  </head>
  <body>
    <!-- Netlify Identity Widget for authentication -->
    <script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
  </body>
</html>
```

## Step 3: Create Admin Config

Create `public/admin/config.js`:

```javascript
import DecapCMS from 'decap-cms-app';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

// Register the media library
DecapCMS.registerMediaLibrary(BunnyMediaLibrary);

// Configure Decap CMS
const config = {
  backend: {
    name: 'test', // Using test backend for this example
  },
  
  // Media library configuration
  media_library: {
    name: 'bunny',
    config: {
      storage_zone_name: process.env.REACT_APP_BUNNY_STORAGE_ZONE,
      api_key: process.env.REACT_APP_BUNNY_API_KEY,
      cdn_url_prefix: process.env.REACT_APP_BUNNY_CDN_URL,
      root_path: '/cms-media/',
    },
  },

  // Content collections
  collections: [
    {
      name: 'blog',
      label: 'Blog Posts',
      folder: 'content/blog',
      create: true,
      slug: '{{slug}}',
      fields: [
        {
          name: 'title',
          label: 'Title',
          widget: 'string',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          widget: 'text',
          required: false,
        },
        {
          name: 'featured_image',
          label: 'Featured Image',
          widget: 'image',
          required: true,
        },
        {
          name: 'body',
          label: 'Content',
          widget: 'markdown',
        },
        {
          name: 'gallery',
          label: 'Image Gallery',
          widget: 'list',
          required: false,
          fields: [
            {
              name: 'image',
              label: 'Image',
              widget: 'image',
            },
            {
              name: 'caption',
              label: 'Caption',
              widget: 'string',
            },
          ],
        },
      ],
    },
    {
      name: 'pages',
      label: 'Pages',
      folder: 'content/pages',
      create: true,
      slug: '{{slug}}',
      fields: [
        {
          name: 'title',
          label: 'Title',
          widget: 'string',
        },
        {
          name: 'hero_image',
          label: 'Hero Image',
          widget: 'image',
        },
        {
          name: 'body',
          label: 'Page Content',
          widget: 'markdown',
        },
      ],
    },
  ],
};

// Initialize CMS with config
DecapCMS.init({ config });
```

## Step 4: Set Environment Variables

Create `.env.local`:

```env
REACT_APP_BUNNY_STORAGE_ZONE=my-storage-zone
REACT_APP_BUNNY_API_KEY=your-storage-zone-password
REACT_APP_BUNNY_CDN_URL=https://my-storage-zone.b-cdn.net
```

## Step 5: Update package.json

Add this to your `package.json`:

```json
{
  "scripts": {
    "admin": "cp -r public/admin/* node_modules/decap-cms-app/dist/admin/",
    "dev": "npm run admin && react-scripts start"
  }
}
```

## Step 6: Create Bunny.net Folders

Before testing, create a storage zone and folder structure in Bunny.net:

```
/storage-zone-root/
  ├── cms-media/
  │   ├── blog/
  │   │   ├── post-1-hero.jpg
  │   │   └── gallery/
  │   │       ├── image-1.jpg
  │   │       └── image-2.jpg
  │   └── pages/
  │       └── homepage-hero.jpg
```

## Step 7: Start Your App

```bash
npm run dev
```

Visit `http://localhost:3000/admin` to access the CMS.

## Usage Walkthrough

### Uploading an Image

1. Navigate to **Blog Posts**
2. Click **New Blog Post**
3. Fill in the **Title** field
4. Click the **Featured Image** field
5. Media library opens
6. Either:
   - Drag an image into the drop zone, or
   - Click to select an image from your computer
7. Select the uploaded image
8. Click **Insert**
9. Image URL is inserted into the field

### Using Image Gallery

1. Scroll to the **Image Gallery** section
2. Click **Add item**
3. Click the **Image** field under the new item
4. Media library opens
5. Upload or select an image
6. Click **Insert**
7. Repeat for each image you want to add

### Managing Files

**Browse:** Use breadcrumbs to navigate folders

**Delete:** Hover over a file and click the trash icon

**Select Multiple:** Click multiple images to select several at once

## Example Configuration with All Features

Here's a more complete example with nested fields:

```javascript
{
  name: 'projects',
  label: 'Projects',
  folder: 'content/projects',
  create: true,
  fields: [
    {
      name: 'title',
      label: 'Project Title',
      widget: 'string',
    },
    {
      name: 'thumbnail',
      label: 'Project Thumbnail',
      widget: 'image',
      hint: '500x300px recommended',
    },
    {
      name: 'content',
      label: 'Content',
      widget: 'object',
      fields: [
        {
          name: 'description',
          label: 'Description',
          widget: 'markdown',
        },
        {
          name: 'screenshots',
          label: 'Screenshots',
          widget: 'list',
          fields: [
            {
              name: 'image',
              label: 'Screenshot',
              widget: 'image',
            },
            {
              name: 'title',
              label: 'Screenshot Title',
              widget: 'string',
            },
          ],
        },
      ],
    },
  ],
}
```

## Troubleshooting

### Media Library Won't Open

- Check browser console for errors
- Verify environment variables are set correctly
- Ensure Bunny.net credentials are valid

### Images Not Loading

- Verify CDN URL is accessible from your network
- Check that storage zone exists in Bunny.net
- Ensure uploaded files are in the correct location

### Uploads Failing

- Verify API key is the **Storage Zone Password**, not your Account API Key
- Check that the storage zone is actively running
- Ensure sufficient quota in your Bunny.net account

### Performance Issues

- Consider archiving old files to a separate storage zone
- Organize files into subdirectories
- Use Bunny CDN for global performance

## Next Steps

- Check [SETUP.md](./SETUP.md) for detailed setup instructions
- Read [TESTING.md](./TESTING.md) for testing procedures
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Explore [Bunny.net documentation](https://docs.bunny.net) for more features

## Support

For issues or questions:
1. Check the troubleshooting guides above
2. Review Bunny.net docs at https://docs.bunny.net
3. Open an issue on [Decap CMS GitHub](https://github.com/decaporg/decap-cms/issues)

---

**Happy content managing with Bunny.net!** 🎉
