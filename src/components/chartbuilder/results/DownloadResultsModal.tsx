import { Modal, Button, CopyButton } from '@navikt/ds-react';
import { Download } from 'lucide-react';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import { translateValue } from '../../../lib/translations';
import { encode } from '@toon-format/toon';

interface DownloadResultsModalProps {
  result: any;
  open: boolean;
  onClose: () => void;
}

const DownloadResultsModal = ({ result, open, onClose }: DownloadResultsModalProps) => {
  const getCSVContent = () => {
    if (!result?.data?.length) return '';
    const headers = Object.keys(result.data[0]);
    const rows = [
      headers.join(','),
      ...result.data.map((row: any) =>
        headers.map((h) => {
          const v = String(translateValue(h, row[h]) ?? '');
          return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.split('"').join('""')}"` : v;
        }).join(',')
      ),
    ];
    return rows.join('\n');
  };

  const getJSONContent = () => {
    if (!result?.data?.length) return '';
    return JSON.stringify(result.data.map((row: any) => {
      const t: any = {};
      Object.keys(row).forEach((k) => { t[k] = translateValue(k, row[k]); });
      return t;
    }), null, 2);
  };

  const getTOONContent = () => {
    if (!result?.data?.length) return '';
    return encode(result.data.map((row: any) => {
      const t: any = {};
      Object.keys(row).forEach((k) => { t[k] = translateValue(k, row[k]); });
      return t;
    }));
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const date = new Date().toISOString().slice(0, 10);

  const downloadCSV = () => {
    const content = getCSVContent();
    if (!content) return;
    triggerDownload(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }), `query_results_${date}.csv`);
  };

  const downloadExcel = () => {
    if (!result?.data?.length) return;
    const headers = Object.keys(result.data[0]);
    const ws = XLSXUtils.aoa_to_sheet([
      headers,
      ...result.data.map((row: any) => headers.map((h) => translateValue(h, row[h]) ?? '')),
    ]);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, 'Query Results');
    triggerDownload(
      new Blob([XLSXWrite(wb, { bookType: 'xlsx', type: 'array' })], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `query_results_${date}.xlsx`
    );
  };

  const downloadJSON = () => {
    const content = getJSONContent();
    if (!content) return;
    triggerDownload(new Blob([content], { type: 'application/json;charset=utf-8;' }), `query_results_${date}.json`);
  };

  const downloadTOON = () => {
    const content = getTOONContent();
    if (!content) return;
    triggerDownload(new Blob([content], { type: 'text/plain;charset=utf-8;' }), `query_results_${date}.toon`);
  };

  return (
    <Modal open={open} onClose={onClose} header={{ heading: 'Last ned resultater' }}>
      <Modal.Body>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Last ned som fil:</p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={downloadCSV} variant="secondary" size="small" icon={<Download size={16} />}>CSV</Button>
              <Button onClick={downloadExcel} variant="secondary" size="small" icon={<Download size={16} />}>Excel</Button>
              <Button onClick={downloadJSON} variant="secondary" size="small" icon={<Download size={16} />}>JSON</Button>
              <Button onClick={downloadTOON} variant="secondary" size="small" icon={<Download size={16} />}>TOON</Button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Eller kopier innholdet:</p>
            <div className="flex gap-2 flex-wrap">
              <CopyButton copyText={getCSVContent()} text="CSV" activeText="CSV kopiert!" size="small" variant="action" />
              <CopyButton copyText={getJSONContent()} text="JSON" activeText="JSON kopiert!" size="small" variant="action" />
              <CopyButton copyText={getTOONContent()} text="TOON" activeText="TOON kopiert!" size="small" variant="action" />
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default DownloadResultsModal;
