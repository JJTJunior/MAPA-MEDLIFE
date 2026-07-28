import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const extractFilename = (urlStr) => {
  if (!urlStr) return null;
  const url = urlStr.split('|||')[0];
  const parts = url.split('/attachments/');
  return parts.length > 1 ? parts[1] : null;
};

async function runCleanup() {
  console.log("Starting master storage cleanup...");

  let allSurgeries = [];
  let hasMore = true;
  let page = 0;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('surgeries')
      .select('medical_request_urls')
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (error) {
      console.error("Error fetching surgeries:", error);
      return;
    }
    
    if (data.length > 0) {
      allSurgeries = allSurgeries.concat(data);
      page++;
    } else {
      hasMore = false;
    }
  }
  
  const referencedFilenames = new Set();
  for (const surgery of allSurgeries) {
    if (surgery.medical_request_urls && Array.isArray(surgery.medical_request_urls)) {
      for (const urlStr of surgery.medical_request_urls) {
        const filename = extractFilename(urlStr);
        if (filename) referencedFilenames.add(filename);
      }
    }
  }

  const { data: bucketFiles, error: bucketError } = await supabase
    .storage
    .from('attachments')
    .list('', { limit: 10000 }); 

  if (bucketError) {
    console.error("Error fetching storage files:", bucketError);
    return;
  }
  
  console.log(`Found ${bucketFiles.length} total files in bucket using service role.`);

  const filesToDelete = [];
  for (const file of bucketFiles) {
    if (file.name === '.emptyFolderPlaceholder' || !file.id) continue;
    if (!referencedFilenames.has(file.name)) {
      filesToDelete.push(file.name);
    }
  }
  
  console.log(`Found ${filesToDelete.length} orphaned files to delete.`);

  if (filesToDelete.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < filesToDelete.length; i += batchSize) {
      const batch = filesToDelete.slice(i, i + batchSize);
      const { data, error } = await supabase.storage.from('attachments').remove(batch);
      if (error) {
        console.error(`Error deleting batch ${i}-${i + batchSize}:`, error);
      } else {
        console.log(`Deleted batch of ${batch.length} files.`);
      }
    }
    console.log("Master cleanup complete!");
  } else {
    console.log("No orphaned files to delete.");
  }
}

runCleanup();
