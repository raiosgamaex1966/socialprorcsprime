import { format } from "date-fns";

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
}

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function generateICSFile(event: CalendarEvent): string {
  const start = formatICSDate(event.startDate);
  const end = formatICSDate(event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000));

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//socialpro//Events//EN", "BEGIN:VEVENT", `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${event.title}`];

  if (event.description) lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
  if (event.location) lines.push(`LOCATION:${event.location}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(event: CalendarEvent) {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const start = format(event.startDate, "yyyyMMdd'T'HHmmss");
  const end = format(event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000), "yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  });

  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
