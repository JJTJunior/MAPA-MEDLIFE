import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not found in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const extractFilename = (urlStr) => {
  if (!urlStr) return null;
  const url = urlStr.split('|||')[0];
  const parts = url.split('/attachments/');
  return parts.length > 1 ? parts[1] : null;
};

async function runCleanup() {
  console.log("Starting storage cleanup...");

  // 1. Fetch all surgeries
  console.log("Fetching surgeries...");
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
  
  console.log(`Found ${allSurgeries.length} surgeries.`);

  // 2. Extract all referenced filenames
  const referencedFilenames = new Set();
  for (const surgery of allSurgeries) {
    if (surgery.medical_request_urls && Array.isArray(surgery.medical_request_urls)) {
      for (const urlStr of surgery.medical_request_urls) {
        const filename = extractFilename(urlStr);
        if (filename) referencedFilenames.add(filename);
      }
    }
  }
  console.log(`Found ${referencedFilenames.size} unique referenced files in DB.`);

  // 3. Fetch all files from storage bucket
  console.log("Fetching files from 'attachments' bucket...");
  const { data: bucketFiles, error: bucketError } = await supabase
    .storage
    .from('attachments')
    .list('', { limit: 10000 }); 

  if (bucketError) {
    console.error("Error fetching storage files:", bucketError);
    return;
  }
  
  console.log(`Found ${bucketFiles.length} total files in bucket.`);

  // 4. Find orphaned files
  const filesToDelete = [];
  for (const file of bucketFiles) {
    // skip folders if any (represented by missing size or placeholder files)
    if (file.name === '.emptyFolderPlaceholder' || !file.id) continue;
    
    if (!referencedFilenames.has(file.name)) {
      filesToDelete.push(file.name);
    }
  }
  
  console.log(`Found ${filesToDelete.length} orphaned files to delete.`);

  // 5. Delete orphaned files
  if (filesToDelete.length > 0) {
    console.log("Deleting orphaned files...");
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
    console.log("Cleanup complete!");
  } else {
    console.log("No orphaned files to delete. Storage is already clean.");
  }
}

runCleanup();
