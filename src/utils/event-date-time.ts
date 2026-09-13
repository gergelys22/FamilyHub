export type PickerMode = 'date' | 'time';

export type DateTimeFieldProps = {
    label: string;
    mode: PickerMode;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    clearable?: boolean;
};

const pad = (value: number) => String(value).padStart(2, '0');

export function parseLocalDateTime(
    dateText: string,
    timeText: string,
): Date | null {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(dateText) ||
        !/^\d{2}:\d{2}$/.test(timeText)
    ) {
        return null;
    }
    const [year, month, day] = dateText.split('-').map(Number);
    const [hours, minutes] = timeText.split(':').map(Number);

    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(hours, minutes, 0, 0);

    if(
        !Number.isFinite(date.getTime()) ||
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day ||
        date.getHours() !== hours ||
        date.getMinutes() !== minutes
    ) {
        return null;
    }

    return date;
}

export function formatPickerValue(date: Date, mode: PickerMode): string {
  if (mode === 'time') {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return [
    String(date.getFullYear()).padStart(4, '0'),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
}

export function getPickerDate(value: string, mode: PickerMode): Date {
  return (
    (mode === 'date'
      ? parseLocalDateTime(value, '12:00')
      : parseLocalDateTime('2000-01-15', value || '19:00')) ?? new Date()
  );
}