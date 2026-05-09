import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  CloudUpload,
  Image,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Send,
  Shield,
  UsersRound,
  XCircle
} from "lucide-react";
import { api } from "./api.js";

function Login({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.login(password);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <div className="brand-mark">L</div>
        <h1>LINE OA Sender</h1>
        <label>
          รหัสแอดมิน
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="กรอกรหัสผ่าน"
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? <Loader2 className="spin" size={18} /> : <Shield size={18} />}
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  );
}

function Stat({ icon, label, value, tone = "green" }) {
  return (
    <div className="stat-panel">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function RecipientBadge({ type }) {
  const label = type === "group" ? "กลุ่ม" : type === "room" ? "ห้อง" : "ผู้ใช้";
  return <span className={`recipient-badge ${type}`}>{label}</span>;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function Dashboard({ onLogout }) {
  const [recipients, setRecipients] = useState([]);
  const [history, setHistory] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [sendTime, setSendTime] = useState("09:00");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [allRecipients, setAllRecipients] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadData() {
    const [recipientData, campaignData, historyData] = await Promise.all([
      api.recipients(),
      api.campaign(),
      api.history()
    ]);

    setRecipients(recipientData.recipients || []);
    setHistory(historyData.logs || []);

    const campaign = campaignData.campaign;
    if (campaign) {
      setMessageText(campaign.message_text || "");
      setSendTime(campaign.send_time || "09:00");
      setScheduleEnabled(Boolean(campaign.enabled));
      setAllRecipients(Boolean(campaign.all_recipients));
      setSelectedIds(Array.isArray(campaign.recipient_ids) ? campaign.recipient_ids.map(Number) : []);

      if (campaign.image_id) {
        setSelectedImage({
          id: campaign.image_id,
          original_url: campaign.image_original_url,
          preview_url: campaign.image_preview_url
        });
      }
    }
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, []);

  const filteredRecipients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return recipients.filter((recipient) => {
      const matchType = filter === "all" || recipient.type === filter;
      const matchSearch = !keyword || recipient.display_name.toLowerCase().includes(keyword);
      return matchType && matchSearch;
    });
  }, [filter, recipients, search]);

  const selectedCount = allRecipients ? recipients.length : selectedIds.length;
  const groupCount = recipients.filter((recipient) => recipient.type === "group").length;
  const userCount = recipients.filter((recipient) => recipient.type === "user").length;
  const successToday = history.filter((item) => item.status === "success").length;
  const failedToday = history.filter((item) => item.status === "failed").length;
  const hasContent = Boolean(messageText.trim() || selectedImage?.id);
  const canSend = hasContent && selectedCount > 0 && !busy;

  function toggleRecipient(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setStatus("");

    try {
      const result = await api.uploadImage(file);
      setSelectedImage(result.image);
      setStatus("อัปโหลดรูปแล้ว");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function payload() {
    return {
      messageText,
      imageId: selectedImage?.id || null,
      allRecipients,
      recipientIds: allRecipients ? [] : selectedIds
    };
  }

  async function sendNow() {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const result = await api.sendNow(payload());
      setStatus(`ส่งแล้ว ${result.success} สำเร็จ, ${result.failed} ไม่สำเร็จ`);
      const historyData = await api.history();
      setHistory(historyData.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule() {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      await api.saveCampaign({
        ...payload(),
        enabled: scheduleEnabled,
        sendTime
      });
      setStatus("บันทึกเวลาส่งรายวันแล้ว");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout();
    onLogout();
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>ส่งข้อความ LINE OA</h1>
            <p>จัดการผู้รับจาก webhook และส่งข้อความหรือรูปได้จากหน้าเดียว</p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => loadData()} aria-label="refresh">
              <RefreshCw size={18} />
            </button>
            <button className="ghost-button logout-button" onClick={logout}>
              <LogOut size={18} />
              ออกจากระบบ
            </button>
          </div>
        </header>

        <section className="stats-row">
          <Stat icon={<CheckCircle2 size={22} />} label="ส่งสำเร็จล่าสุด" value={successToday} />
          <Stat icon={<XCircle size={22} />} label="ส่งไม่สำเร็จล่าสุด" value={failedToday} tone="red" />
          <Stat icon={<UsersRound size={22} />} label="กลุ่มทั้งหมด" value={groupCount} tone="blue" />
          <Stat icon={<UsersRound size={22} />} label="ผู้ใช้ทั้งหมด" value={userCount} tone="gray" />
        </section>

        {(status || error) && (
          <div className={`notice ${error ? "error" : "success"}`}>
            {error || status}
          </div>
        )}

        <section className="dashboard-grid">
          <section className="panel compose-panel">
            <div className="panel-heading">
              <div>
                <span>1</span>
                <h2>เขียนข้อความ</h2>
              </div>
            </div>
            <label className="field-label">
              ข้อความ
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                maxLength={5000}
                placeholder="พิมพ์ข้อความที่ต้องการส่ง"
              />
            </label>
            <div className="textarea-footer">{messageText.length}/5000</div>

            <div className="upload-row">
              {selectedImage?.preview_url ? (
                <div className="image-preview">
                  <img src={selectedImage.preview_url} alt="preview" />
                  <button className="ghost-button" onClick={() => setSelectedImage(null)}>
                    ลบรูป
                  </button>
                </div>
              ) : (
                <label className="upload-box">
                  <input type="file" accept="image/png,image/jpeg" onChange={upload} />
                  {uploading ? <Loader2 className="spin" /> : <CloudUpload />}
                  <strong>อัปโหลดรูปภาพ</strong>
                  <span>JPG, PNG ขนาดไม่เกิน 10MB</span>
                </label>
              )}
            </div>
          </section>

          <section className="panel recipients-panel">
            <div className="panel-heading">
              <div>
                <span>2</span>
                <h2>เลือกผู้รับ</h2>
              </div>
            </div>

            <div className="segmented">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>ทั้งหมด</button>
              <button className={filter === "user" ? "active" : ""} onClick={() => setFilter("user")}>ผู้ใช้</button>
              <button className={filter === "group" ? "active" : ""} onClick={() => setFilter("group")}>กลุ่ม</button>
            </div>

            <label className="search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาด้วยชื่อ"
              />
            </label>

            <label className="check-row select-all">
              <input
                type="checkbox"
                checked={allRecipients}
                onChange={(event) => setAllRecipients(event.target.checked)}
              />
              <span>ส่งให้ทั้งหมดที่ระบบรู้จัก ({recipients.length})</span>
            </label>

            <div className="recipient-list">
              {filteredRecipients.length ? (
                filteredRecipients.map((recipient) => (
                  <label className="recipient-row" key={recipient.id}>
                    <input
                      type="checkbox"
                      disabled={allRecipients}
                      checked={allRecipients || selectedIds.includes(Number(recipient.id))}
                      onChange={() => toggleRecipient(Number(recipient.id))}
                    />
                    {recipient.picture_url ? (
                      <img src={recipient.picture_url} alt="" />
                    ) : (
                      <div className="avatar-fallback">{recipient.display_name.slice(0, 1)}</div>
                    )}
                    <span>{recipient.display_name}</span>
                    <RecipientBadge type={recipient.type} />
                  </label>
                ))
              ) : (
                <div className="empty-state">
                  <UsersRound size={24} />
                  <p>ยังไม่มีผู้รับจาก webhook</p>
                </div>
              )}
            </div>
            <div className="selection-footer">เลือกอยู่ {selectedCount} รายการ</div>
          </section>

          <section className="panel schedule-panel">
            <div className="panel-heading">
              <div>
                <span>3</span>
                <h2>ตั้งเวลาส่งรายวัน</h2>
              </div>
            </div>

            <label className="switch-row">
              <span>เปิดใช้งาน</span>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
              />
            </label>

            <label className="field-label">
              เวลา
              <div className="time-input">
                <Clock3 size={18} />
                <input
                  type="time"
                  value={sendTime}
                  onChange={(event) => setSendTime(event.target.value)}
                />
              </div>
            </label>

            <button className="primary-button" onClick={sendNow} disabled={!canSend}>
              {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              ส่งทันที
            </button>
            <button className="secondary-button" onClick={saveSchedule} disabled={busy}>
              บันทึกเวลาส่ง
            </button>
          </section>
        </section>

        <section className="panel history-panel">
          <div className="panel-heading inline">
            <div>
              <span>4</span>
              <h2>ประวัติการส่งล่าสุด</h2>
            </div>
            <button className="ghost-button" onClick={() => loadData()}>ดูใหม่</button>
          </div>

          <div className="history-table">
            <div className="history-head">
              <span>เวลา</span>
              <span>ผู้รับ</span>
              <span>ประเภท</span>
              <span>สถานะ</span>
            </div>
            {history.length ? (
              history.map((item) => (
                <div className="history-row" key={item.id}>
                  <span>{formatDateTime(item.sent_at)}</span>
                  <span>{item.recipient_display_name}</span>
                  <span><RecipientBadge type={item.recipient_type} /></span>
                  <span className={`status-pill ${item.status}`}>
                    {item.status === "success" ? "สำเร็จ" : "ไม่สำเร็จ"}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-history">
                <Image size={22} />
                ยังไม่มีประวัติการส่ง
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default function App() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  async function checkSession() {
    try {
      const result = await api.session();
      setAuthenticated(Boolean(result.authenticated));
    } catch {
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  if (checking) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" />
      </main>
    );
  }

  return authenticated ? (
    <Dashboard onLogout={() => setAuthenticated(false)} />
  ) : (
    <Login onLoggedIn={() => setAuthenticated(true)} />
  );
}
