import { Router } from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/book.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadThumbnail } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', getBooks);
router.get('/:id', getBookById);

router.post('/', authenticate, uploadThumbnail.single('thumbnail'), createBook);
router.put('/:id', authenticate, uploadThumbnail.single('thumbnail'), updateBook);
router.delete('/:id', authenticate, deleteBook);

export default router;
