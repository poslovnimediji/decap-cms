type ReadFile = (
  path: string,
  id: string | null | undefined,
  options: { parseText: boolean },
) => Promise<string | Blob>;

type ReadFileMetadata = (path: string, id: string | null | undefined) => Promise<any>;

type File = {
  type: string;
  id: string;
  name: string;
  path: string;
  size: number;
};

export class SupabaseClient {
  supabaseUrl: string;
  supabaseAnonKey: string;
  branch: string;
  repo: string;

  constructor(supabaseUrl: string, supabaseAnonKey: string, branch: string, repo: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.branch = branch;
    this.repo = repo;
  }

  async fetchDb(uri: string, method: string, body: any = null) {
    try {
      const response = await fetch(`${this.supabaseUrl}${uri}`, {
        method: method || 'POST',
        headers: {
          apikey: this.supabaseAnonKey,
          Authorization: 'Bearer ' + this.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Supabase error:', error);
        throw new Error(`Supabase request failed: ${error.message || response.statusText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Failed to fetch from Supabase:', error);
      throw error;
    }
  }

  async fetchEntries(collection: string) {
    console.log('Fetching entries from supabase for collection:', collection);
    const response = await this.fetchDb(
      `?repo=eq.${encodeURIComponent(this.repo)}&branch=eq.${encodeURIComponent(
        this.branch,
      )}&collection=eq.${encodeURIComponent(collection)}`,
      'GET',
    );
    
    return response.map((data: any) => ({
        file: data.file_meta,
        data: data.file_data,
    }));
  }

  async fetchDbFiles(collection: string) {
    console.log('Fetching file list from supabase for collection:', collection);
    const response = await this.fetchDb(
      `?repo=eq.${encodeURIComponent(this.repo)}&branch=eq.${encodeURIComponent(
        this.branch,
      )}&collection=eq.${encodeURIComponent(collection)}&select=file_id`,
      'GET',
    );
    return response;
  }

  async removeDbFiles(collection: string, fileIds: string[]) {
    console.log('Removing files from supabase with IDs:', fileIds);
    const fileIdsParam = fileIds.map(id => `"${id}"`).join(',');
    await this.fetchDb(
      `?repo=eq.${encodeURIComponent(this.repo)}&branch=eq.${encodeURIComponent(
        this.branch,
      )}&collection=eq.${encodeURIComponent(collection)}&file_id=in.(${fileIdsParam})`,
      'DELETE',
    );
  }

  async insertDbFile(
    collection: string,
    fileId: string,
    filePath: string,
    fileMeta: any,
    fileData: string | Blob,
  ) {
    await this.fetchDb('', 'POST', {
      repo: this.repo,
      branch: this.branch,
      collection: collection,
      file_id: fileId,
      file_path: filePath,
      file_meta: fileMeta,
      file_data: fileData,
    });
  }

  async validateFiles(
    collection: string,
    files: File[],
    readFile: ReadFile,
    readFileMetadata: ReadFileMetadata,
  ) {
    let cacheOk = true;


    const dbFiles = await this.fetchDbFiles(collection);
    const fileIds = files.map(f => f.id);

    const dbFileIds = dbFiles.map((f: any) => f.file_id);
    const filesToRemove = dbFileIds.filter((id: string) => !fileIds.includes(id));
    if (filesToRemove.length > 0) {
        cacheOk = false;
    }
    if (filesToRemove.length > 0) {
      await this.removeDbFiles(collection, filesToRemove);
    }

    const filesToAdd = files.filter(f => !dbFileIds.includes(f.id));
    if (filesToAdd.length > 0) {
        cacheOk = false;
    }

    await Promise.all(
      filesToAdd.map(async file => {
        const [content, metadata] = await Promise.all([
          readFile(file.path, file.id, { parseText: true }),
          readFileMetadata(file.path, file.id),
        ]);

        const loadedEntry = { file: { ...file, ...metadata }, data: content };

        await this.insertDbFile(
          collection,
          file.id,
          file.path,
          loadedEntry.file,
          loadedEntry.data,
        );
      }),
    );

    if (cacheOk) {
      console.log('Cache is up to date for collection:', collection);
      return;
    }

    return;
  }
}
