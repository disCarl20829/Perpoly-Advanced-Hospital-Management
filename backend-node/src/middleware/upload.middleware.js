import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

function excelFileFilter(req, file, cb) {
    const extension = path.extname(file.originalname || '').toLowerCase();

    if (extension !== '.xlsx') {
        const err = new Error('Only .xlsx Excel files are supported');
        err.status = 400;
        return cb(err);
    }

    cb(null, true);
}

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: excelFileFilter
});

/**
 * Accept a single Excel file from multipart/form-data under the `file` field.
 * Multer errors are converted to HTTP 400 responses.
 */
export function excelUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (err) {
            err.status = err.status || 400;
            return next(err);
        }
        next();
    });
}
