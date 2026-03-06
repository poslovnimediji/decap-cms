import { DecapCmsApp as CMS } from 'decap-cms-app';
// Media libraries
import uploadcare from 'decap-cms-media-library-uploadcare';
import cloudinary from 'decap-cms-media-library-cloudinary';
import BunnyMediaLibrary from 'decap-cms-media-library-bunny';

CMS.registerMediaLibrary(uploadcare);
CMS.registerMediaLibrary(cloudinary);
CMS.registerMediaLibrary(BunnyMediaLibrary);
