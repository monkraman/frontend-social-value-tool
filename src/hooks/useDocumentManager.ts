import { useState, useEffect, useCallback } from 'react';
import type { DocumentItem } from '../types';
import {
  fetchDocuments,
  uploadDocumentFile,
  archiveDocumentById,
  restoreDocumentById,
  permanentlyDeleteDocumentById,
  fetchDocumentChunks
} from '../api/client';
import type { DocumentChunkItem } from '../types';
import { useToast } from '../context/ToastContext';

export function useDocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const toast = useToast();

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    fetchDocuments()
      .then((docs) => {
        if (isSubscribed) setDocuments(docs);
      })
      .catch((err) => {
        console.error('Failed to load initial documents:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setStatusMessage({ text: `Processing and vectorizing "${file.name}"...` });
    try {
      const res = await uploadDocumentFile(file);
      setStatusMessage({ text: res.message, isError: !res.success });
      toast.success(res.message);
      await loadDocuments();
      return res;
    } catch (err: any) {
      const errMsg = `Upload failed: ${err.message}`;
      setStatusMessage({ text: errMsg, isError: true });
      toast.error(errMsg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [loadDocuments, toast]);

  // Soft Delete (Archive)
  const archiveDocument = useCallback(async (id: string, filename: string) => {
    try {
      const res = await archiveDocumentById(id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_archived: true, archived_at: new Date().toISOString() } : d))
      );
      const msg = res.message || `"${filename}" archived (soft-deleted). Excluded from RAG vector search.`;
      setStatusMessage({ text: msg });
      toast.warning(msg);
    } catch (err: any) {
      const errMsg = `Failed to archive "${filename}": ${err.message}`;
      setStatusMessage({ text: errMsg, isError: true });
      toast.error(errMsg);
    }
  }, [toast]);

  // Restore Soft-Deleted Document
  const restoreDocument = useCallback(async (id: string, filename: string) => {
    try {
      const res = await restoreDocumentById(id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_archived: false, archived_at: null } : d))
      );
      const msg = res.message || `"${filename}" restored to active repository & vector search.`;
      setStatusMessage({ text: msg });
      toast.success(msg);
    } catch (err: any) {
      const errMsg = `Failed to restore "${filename}": ${err.message}`;
      setStatusMessage({ text: errMsg, isError: true });
      toast.error(errMsg);
    }
  }, [toast]);

  // Permanent Hard Delete (Erase chunks & vector embeddings)
  const hardDeleteDocument = useCallback(async (id: string, filename: string) => {
    try {
      const res = await permanentlyDeleteDocumentById(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      const msg = res.message || `"${filename}" permanently deleted along with all vector embeddings.`;
      setStatusMessage({ text: msg });
      toast.error(msg);
    } catch (err: any) {
      const errMsg = `Failed to permanently delete "${filename}": ${err.message}`;
      setStatusMessage({ text: errMsg, isError: true });
      toast.error(errMsg);
    }
  }, [toast]);

  const getChunksForDocument = useCallback(async (id: string): Promise<DocumentChunkItem[]> => {
    return await fetchDocumentChunks(id);
  }, []);

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunks_count || 0), 0);

  return {
    documents,
    isLoading,
    isUploading,
    statusMessage,
    totalChunks,
    loadDocuments,
    uploadFile,
    getChunksForDocument,
    archiveDocument,
    restoreDocument,
    hardDeleteDocument,
    deleteDocument: archiveDocument,
    clearStatus: () => setStatusMessage(null)
  };
}
