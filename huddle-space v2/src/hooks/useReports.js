import { useState, useEffect } from "react";
import { collection, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { ADMIN_NAMES } from "../constants";

export default function useReports(profile) {
  const [reports, setReports] = useState([]);
  const [reportsPanelOpen, setReportsPanelOpen] = useState(false);

  useEffect(() => {
    if (!profile || !ADMIN_NAMES.includes(profile.name)) return;
    const unsub = onSnapshot(collection(db, "reports"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setReports(list);
    });
    return () => unsub();
  }, [profile]);

  async function dismissReport(reportId) {
    await updateDoc(doc(db, "reports", reportId), { resolved: true });
  }

  return { reports, reportsPanelOpen, setReportsPanelOpen, dismissReport };
}
