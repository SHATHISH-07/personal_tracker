import * as XLSX from "xlsx";

interface ChecklistItem {
  _id?: string;
  title: string;
  completed: boolean;
}

interface TopicItem {
  _id?: string;
  name: string;
  description?: string;
  subtopics?: string[];
  checklist?: ChecklistItem[];
  monthNumber?: number;
  periodNumber?: number;
  completed: boolean;
}

interface PlanItem {
  _id: string;
  title: string;
  planType?: "weekly" | "monthly";
  durationMonths: number;
  description: string;
  status: string;
  topics?: TopicItem[];
}

interface StudySession {
  startTime: string;
  endTime: string;
  actualMinutes: number;
  topicsCovered: string[];
  description: string;
}

interface DailyLog {
  date: string;
  planId?: string;
  sessions?: StudySession[];
  notes?: string;
}

export async function generatePerformanceReport(plan: PlanItem) {
  const wb = XLSX.utils.book_new();

  // ============================
  // PREPARE TOPICS DATA
  // ============================
  const topicsData: Record<string, string | number>[] = [];
  const topics = plan.topics || [];

  topics.forEach((topic) => {
    let subtopicsList: string[] = [];
    if (topic.checklist && topic.checklist.length > 0) {
      subtopicsList = topic.checklist.map(
        (c) => `${c.completed ? "✓" : "○"} ${c.title}`
      );
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      subtopicsList = topic.subtopics;
    }

    topicsData.push({
      planName: plan.title,
      topicName: topic.name,
      topicDesc: topic.description || "",
      subtopics: subtopicsList.join("\n"),
    });
  });

  // ============================
  // PREPARE DAILY RECORDS DATA
  // ============================
  const dailyData: Record<string, string | number>[] = [];
  try {
    const res = await fetch(`/api/logs?planId=${plan._id}`);
    const json = await res.json();

    if (json.success && json.data && json.data.length > 0) {
      const logs: DailyLog[] = json.data;
      logs.sort((a, b) => a.date.localeCompare(b.date));

      logs.forEach((log) => {
        if (log.sessions && log.sessions.length > 0) {
          log.sessions.forEach((session) => {
            dailyData.push({
              date: log.date,
              startTime: session.startTime || "",
              endTime: session.endTime || "",
              duration: session.actualMinutes || 0,
              topicsCovered: (session.topicsCovered || []).join(", "),
              description: session.description || "",
            });
          });
        }
      });
    }
  } catch (e) {
    console.error("Failed to fetch daily logs for report", e);
  }

  // ============================
  // MERGE SIDE-BY-SIDE
  // ============================
  const maxRows = Math.max(topicsData.length, dailyData.length, 1);
  const combinedData: Record<string, string | number>[] = [];

  for (let i = 0; i < maxRows; i++) {
    const t = topicsData[i] || {};
    const d = dailyData[i] || {};

    combinedData.push({
      "Plan Name": t.planName || (i === 0 ? plan.title : ""),
      "Topic": t.topicName || "",
      "Topic Description": t.topicDesc || "",
      "Subtopics": t.subtopics || "",
      "|": "", // visual separator
      "Daily Record Date": d.date || "",
      "Start Time": d.startTime || "",
      "End Time": d.endTime || "",
      "Topics Covered": d.topicsCovered || "",
      "Daily Record Description": d.description || "",
    });
  }

  const ws = XLSX.utils.json_to_sheet(combinedData);

  // Set column widths
  ws["!cols"] = [
    { wch: 25 }, // Plan Name
    { wch: 30 }, // Topic
    { wch: 40 }, // Topic Description
    { wch: 50 }, // Subtopics
    { wch: 3 },  // |
    { wch: 15 }, // Daily Record Date
    { wch: 12 }, // Start Time
    { wch: 12 }, // End Time
    { wch: 35 }, // Topics Covered
    { wch: 50 }, // Daily Record Description
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Roadmap Data");

  // ============================
  // Download
  // ============================
  const fileName = `${plan.title.replace(/\s+/g, "_")}_Report.xlsx`;
  XLSX.writeFile(wb, fileName);
}
