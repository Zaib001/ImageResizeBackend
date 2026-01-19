const app = require('./app');
const TempFileManager = require('./utils/TempFileManager');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Ensure temp directory exists on startup
TempFileManager.ensureDir();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Temp directory: ${TempFileManager.baseDir}`);
});