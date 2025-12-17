// move sbUrl to config, figure out authentication and remove sbKey
// save config.yml cache so you know when to invalidate?
const sbUrl = 'https://zqqagkysifxznmpjpxvr.supabase.co/rest/v1/data';
const sbKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcWFna3lzaWZ4em5tcGpweHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODczMTgsImV4cCI6MjA4MTQ2MzMxOH0.wUmbA_IHdIJsg4mqoOZXa8DNuvLRjYW3r9MWNkfOMJw';

export async function saveDataFileToDbCache(collectionName, dataFile) {
  try {
    const checkResponse = await fetch(
      `${sbUrl}?file_path=eq.${encodeURIComponent(
        dataFile.path,
      )}&collection=eq.${encodeURIComponent(collectionName)}`,
      {
        method: 'GET',
        headers: {
          apikey: sbKey,
          Authorization: 'Bearer ' + sbKey,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!checkResponse.ok) {
      console.error(
        'Failed to check if dataFile exists in Supabase:',
        dataFile.path,
        checkResponse.statusText,
      );
      return false;
    }

    const existingRecords = await checkResponse.json();
    const exists = existingRecords && existingRecords.length > 0;

    let response;
    if (exists) {
      response = await fetch(
        `${sbUrl}?file_path=eq.${encodeURIComponent(
          dataFile.path,
        )}&collection=eq.${encodeURIComponent(collectionName)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: sbKey,
            Authorization: 'Bearer ' + sbKey,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            file_src: dataFile.raw,
            file_json: dataFile.json || {},
          }),
        },
      );
    } else {
      response = await fetch(sbUrl, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: 'Bearer ' + sbKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          file_src: dataFile.raw,
          file_path: dataFile.path,
          file_json: dataFile.json || {},
          collection: collectionName,
        }),
      });
    }

    if (!response.ok) {
      console.error(
        `Failed to ${exists ? 'update' : 'insert'} dataFile to Supabase:`,
        dataFile.path,
        response.statusText,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending dataFile to Supabase:', dataFile.path, error);
    return false;
  }
}

export async function saveDataFilesByCollection(collectionName, dataFiles) {
  try {
    // First, get all existing files for this collection
    const checkResponse = await fetch(
      `${sbUrl}?collection=eq.${encodeURIComponent(collectionName)}&select=file_path`,
      {
        method: 'GET',
        headers: {
          apikey: sbKey,
          Authorization: 'Bearer ' + sbKey,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!checkResponse.ok) {
      console.error('Failed to check existing files in Supabase:', checkResponse.statusText);
      return { success: false, inserted: 0, updated: 0 };
    }

    const existingRecords = await checkResponse.json();
    const existingPaths = new Set(existingRecords.map(r => r.file_path));

    // Separate files into insert and update batches
    const toInsert = [];
    const toUpdate = [];

    for (const dataFile of dataFiles) {
      if (existingPaths.has(dataFile.path)) {
        toUpdate.push(dataFile);
      } else {
        toInsert.push(dataFile);
      }
    }

    let insertCount = 0;
    let updateCount = 0;

    // Batch insert new files
    if (toInsert.length > 0) {
      const insertResponse = await fetch(sbUrl, {
        method: 'POST',
        headers: {
          apikey: sbKey,
          Authorization: 'Bearer ' + sbKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(
          toInsert.map(dataFile => ({
            file_src: dataFile.raw,
            file_path: dataFile.path,
            file_json: dataFile.json || {},
            collection: collectionName,
          })),
        ),
      });

      if (insertResponse.ok) {
        insertCount = toInsert.length;
      } else {
        console.error('Failed to batch insert files:', insertResponse.statusText);
      }
    }

    // Batch update existing files (need to do one by one due to unique paths)
    for (const dataFile of toUpdate) {
      const updateResponse = await fetch(
        `${sbUrl}?file_path=eq.${encodeURIComponent(
          dataFile.path,
        )}&collection=eq.${encodeURIComponent(collectionName)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: sbKey,
            Authorization: 'Bearer ' + sbKey,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            file_src: dataFile.raw,
            file_json: dataFile.json || {},
          }),
        },
      );

      if (updateResponse.ok) {
        updateCount++;
      }
    }

    console.log(
      `Batch saved to Supabase - Collection: ${collectionName}, Inserted: ${insertCount}, Updated: ${updateCount}`,
    );

    return { success: true, inserted: insertCount, updated: updateCount };
  } catch (error) {
    console.error('Error batch saving dataFiles to Supabase:', collectionName, error);
    return { success: false, inserted: 0, updated: 0 };
  }
}

export async function getDataFilesByCollection(collectionName) {
  try {
    const response = await fetch(`${sbUrl}?collection=eq.${encodeURIComponent(collectionName)}`, {
      method: 'GET',
      headers: {
        apikey: sbKey,
        Authorization: 'Bearer ' + sbKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        'Failed to retrieve dataFiles from Supabase:',
        collectionName,
        response.statusText,
      );
      return [];
    }

    const records = await response.json();

    console.log('Retrieved dataFiles from Supabase:', collectionName, records.length);

    return records.map(record => record.file_json);
  } catch (error) {
    console.error('Error retrieving dataFiles from Supabase:', collectionName, error);
    return [];
  }
}
