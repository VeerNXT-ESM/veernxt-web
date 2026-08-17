import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const accountId = "3407b19182fb6ab1a3ea73221b7c9dcf";
const accessKeyId = "e2721a5f186baa5bf9af8be80d00a050";
const secretAccessKey = "feff72f0bde181778944d62f93ae2862e1bca5e23e4137f5349646d3093b1a15";
const bucketName = "veernxt-resources";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function run() {
  let count = 0;
  let isTruncated = true;
  let continuationToken = undefined;

  console.log("Fetching objects...");
  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    });
    
    try {
      const response = await s3.send(command);
      
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key.includes('Central Exam') || item.Key.toLowerCase().includes('central_exam')) {
             count++;
          }
        }
      }
      
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    } catch (err) {
      console.error("Error", err);
      break;
    }
  }

  console.log("Total Central Exam documents:", count);
}

run();
