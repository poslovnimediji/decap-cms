/**
 * Decap CMS Media Library Integration for Bunny.net
 * Main entry point that exports the media library interface
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import BunnyWidget from './components/BunnyWidget';

/**
 * Initialize the Bunny.net media library
 * @param options - Configuration options including storageZoneName, apiKey, cdnUrlPrefix
 * @param handleInsert - Callback function when user inserts files
 * @returns MediaLibraryInstance with show, hide, and other required methods
 */
async function init({ options = {}, handleInsert = () => {} } = {}) {
  const { config: providedConfig = {} } = options;

  // Validate required configuration
  if (!providedConfig.storage_zone_name) {
    throw new Error('storage_zone_name is required in media_library config');
  }
  if (!providedConfig.api_key) {
    throw new Error('api_key is required in media_library config');
  }
  if (!providedConfig.cdn_url_prefix) {
    throw new Error('cdn_url_prefix is required in media_library config');
  }

  const config = providedConfig;
  let widgetContainer = null;
  let widgetRoot = null;
  let isOpen = false;

  const mediaLibraryInstance = {
    /**
     * Show the media library widget
     */
    show: ({ allowMultiple = false, imagesOnly = false } = {}) => {
      if (isOpen) return;

      // Create container if it doesn't exist
      if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        document.body.appendChild(widgetContainer);
      }

      isOpen = true;

      // Create React root
      widgetRoot = createRoot(widgetContainer);

      // Render the widget
      widgetRoot.render(
        React.createElement(BunnyWidget, {
          config,
          onInsert: insertedValue => {
            handleInsert(insertedValue);
            mediaLibraryInstance.hide();
          },
          onClose: () => {
            mediaLibraryInstance.hide();
          },
          allowMultiple,
          imagesOnly,
        }),
      );
    },

    /**
     * Hide the media library widget
     */
    hide: () => {
      if (!isOpen || !widgetRoot) return;

      isOpen = false;

      // Unmount React component
      widgetRoot.unmount();

      // Remove container from DOM
      if (widgetContainer && widgetContainer.parentNode) {
        widgetContainer.parentNode.removeChild(widgetContainer);
        widgetContainer = null;
        widgetRoot = null;
      }
    },

    /**
     * Handle field clear - currently no-op
     */
    onClearControl: () => {
      // No-op for this implementation
    },

    /**
     * Handle field removal - currently no-op
     */
    onRemoveControl: () => {
      // No-op for this implementation
    },

    /**
     * Enable standalone mode - allows widget to appear in toolbar and field buttons
     */
    enableStandalone: () => true,
  };

  return mediaLibraryInstance;
}

/**
 * Export the media library instance for Decap CMS
 */
const bunnyMediaLibrary = {
  name: 'bunny',
  init,
};

export const DecapCmsMediaLibraryBunny = bunnyMediaLibrary;
export default bunnyMediaLibrary;
