/**
 * 匯出工具函數
 * 支援 Excel 和 ICS 格式匯出
 */

// ==================== Excel 匯出 ====================

interface ScheduleExportRow {
  date: string;
  time: string;
  title: string;
  address: string;
  voterName: string;
  phone: string;
  lineId: string;
  status: string;
  notes: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '待執行',
  IN_PROGRESS: '進行中',
  COMPLETED: '已完成',
  SKIPPED: '已跳過',
  CANCELLED: '已取消',
  DRAFT: '草稿',
  PLANNED: '已規劃',
};

/**
 * 將行程資料轉換為 Excel 格式的 CSV
 */
export function scheduleToCSV(schedules: any[]): string {
  const headers = ['日期', '時間', '行程標題', '地點', '選民姓名', '電話', 'LINE ID', '狀態', '備註'];
  const rows: string[][] = [headers];

  schedules.forEach(schedule => {
    const scheduleDate = new Date(schedule.date);
    const dateStr = scheduleDate.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    if (!schedule.items || schedule.items.length === 0) {
      // 沒有項目的行程
      rows.push([
        dateStr,
        '',
        schedule.title || '',
        '',
        '',
        '',
        '',
        STATUS_LABELS[schedule.status] || schedule.status || '',
        schedule.description || '',
      ]);
    } else {
      // 有項目的行程
      schedule.items.forEach((item: any, index: number) => {
        const timeStr = item.plannedTime
          ? new Date(item.plannedTime).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        rows.push([
          index === 0 ? dateStr : '',
          timeStr,
          index === 0 ? schedule.title || '' : '',
          item.address || item.voter?.address || '',
          item.voter?.name || '',
          item.voter?.phone || '',
          item.voter?.lineId || '',
          STATUS_LABELS[item.status] || item.status || '',
          item.notes || '',
        ]);
      });
    }
  });

  // 轉換為 CSV 格式
  return rows
    .map(row =>
      row.map(cell => {
        // 處理包含逗號或換行的欄位
        if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
    .join('\n');
}

/**
 * 下載 CSV 檔案
 */
export function downloadCSV(csv: string, filename: string): void {
  // 加入 BOM 以支援中文在 Excel 中正確顯示
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== ICS 匯出 ====================

/**
 * 將日期轉換為 ICS 格式
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * 生成唯一 ID
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@election-system`;
}

/**
 * 將行程資料轉換為 ICS 格式
 */
export function scheduleToICS(schedules: any[]): string {
  const events: string[] = [];

  schedules.forEach(schedule => {
    const scheduleDate = new Date(schedule.date);

    if (!schedule.items || schedule.items.length === 0) {
      // 沒有項目的行程 - 建立全天事件
      const startDate = new Date(scheduleDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      events.push(createICSEvent({
        uid: generateUID(),
        summary: schedule.title || '拜訪行程',
        description: schedule.description || '',
        location: '',
        dtstart: formatICSDate(startDate).split('T')[0],
        dtend: formatICSDate(endDate).split('T')[0],
        allDay: true,
      }));
    } else {
      // 有項目的行程 - 為每個項目建立事件
      schedule.items.forEach((item: any) => {
        const startTime = item.plannedTime
          ? new Date(item.plannedTime)
          : new Date(scheduleDate.setHours(9, 0, 0, 0));

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + (item.duration || 30));

        const voterInfo = item.voter
          ? `選民：${item.voter.name}${item.voter.phone ? `\n電話：${item.voter.phone}` : ''}${item.voter.lineId ? `\nLINE：${item.voter.lineId}` : ''}`
          : '';

        events.push(createICSEvent({
          uid: generateUID(),
          summary: `${schedule.title || '拜訪'} - ${item.voter?.name || item.address || '行程項目'}`,
          description: `${voterInfo}${item.notes ? `\n\n備註：${item.notes}` : ''}`,
          location: item.address || item.voter?.address || '',
          dtstart: formatICSDate(startTime),
          dtend: formatICSDate(endTime),
          allDay: false,
        }));
      });
    }
  });

  return createICSCalendar(events);
}

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
  allDay: boolean;
}

function createICSEvent(event: ICSEvent): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${event.dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${event.dtend}`);
  } else {
    lines.push(`DTSTART:${event.dtstart}`);
    lines.push(`DTEND:${event.dtend}`);
  }

  lines.push(`SUMMARY:${escapeICSText(event.summary)}`);

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

function createICSCalendar(events: string[]): string {
  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//選情系統//選民關係管理平台//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:選情系統行程',
    'X-WR-TIMEZONE:Asia/Taipei',
    ...events,
    'END:VCALENDAR',
  ];

  return calendar.join('\r\n');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * 下載 ICS 檔案
 */
export function downloadICS(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
