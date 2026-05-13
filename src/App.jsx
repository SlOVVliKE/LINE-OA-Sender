import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Copy,
  Image,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  UsersRound,
  XCircle
} from "lucide-react";
import { api } from "./api.js";

const emptyBotForm = {
  id: null,
  name: "",
  channelAccessToken: "",
  channelSecret: "",
  isActive: true
};

const emptyUserForm = {
  id: null,
  displayName: "",
  password: "",
  isActive: true,
  botIds: []
};

function Login({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.login(password);
      onLoggedIn(result.session);
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
          รหัสผ่าน
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

function Header({ title, subtitle, onRefresh, onLogout, children }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        {children}
        {onRefresh ? (
          <button className="icon-button" onClick={onRefresh} aria-label="refresh">
            <RefreshCw size={18} />
          </button>
        ) : null}
        <button className="ghost-button logout-button" onClick={onLogout}>
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}

function AdminDashboard({ session, onLogout }) {
  const [bots, setBots] = useState([]);
  const [users, setUsers] = useState([]);
  const [botForm, setBotForm] = useState(emptyBotForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [botSearch, setBotSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadAdminData() {
    const [botData, userData] = await Promise.all([
      api.adminBots(),
      api.adminUsers()
    ]);
    setBots(botData.bots || []);
    setUsers(userData.users || []);
  }

  useEffect(() => {
    loadAdminData().catch((err) => setError(err.message));
  }, []);

  const filteredBots = useMemo(() => {
    const keyword = botSearch.trim().toLowerCase();
    if (!keyword) return bots;
    return bots.filter((botItem) => botItem.name.toLowerCase().includes(keyword));
  }, [botSearch, bots]);

  function resetBotForm() {
    setBotForm(emptyBotForm);
  }

  function resetUserForm() {
    setUserForm(emptyUserForm);
  }

  async function saveBot(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    try {
      if (botForm.id) {
        await api.updateAdminBot(botForm.id, botForm);
        setStatus("บันทึก botlineOA แล้ว");
      } else {
        await api.createAdminBot(botForm);
        setStatus("เพิ่ม botlineOA แล้ว");
      }
      resetBotForm();
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");

    try {
      if (userForm.id) {
        await api.updateAdminUser(userForm.id, {
          displayName: userForm.displayName,
          password: userForm.password,
          isActive: userForm.isActive,
          botIds: userForm.botIds
        });
        setStatus("บันทึก UserOA แล้ว");
      } else {
        await api.createAdminUser({
          displayName: userForm.displayName,
          password: userForm.password,
          isActive: userForm.isActive,
          botIds: userForm.botIds
        });
        setStatus("เพิ่ม UserOA แล้ว");
      }
      resetUserForm();
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteBot(id) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.deleteAdminBot(id);
      setStatus("ปิดใช้งาน botlineOA แล้ว");
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.deleteAdminUser(id);
      setStatus("ปิดใช้งาน UserOA แล้ว");
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleUserBot(botId) {
    setUserForm((current) => ({
      ...current,
      botIds: current.botIds.includes(botId)
        ? current.botIds.filter((id) => id !== botId)
        : [...current.botIds, botId]
    }));
  }

  async function copyWebhook(webhookUrl) {
    setError("");
    setStatus("");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(webhookUrl);
      } else {
        const textarea = document.createElement("textarea");
        try {
          textarea.value = webhookUrl;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
        } finally {
          textarea.remove();
        }
      }
      setStatus("คัดลอก webhook แล้ว");
    } catch {
      setError("คัดลอก webhook ไม่สำเร็จ");
    }
  }

  async function logout() {
    await api.logout();
    onLogout();
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <Header
          title="Admin"
          subtitle={`จัดการ UserOA และ botlineOA (${session.displayName || "Admin"})`}
          onRefresh={loadAdminData}
          onLogout={logout}
        />

        {(status || error) && (
          <div className={`notice ${error ? "error" : "success"}`}>
            {error || status}
          </div>
        )}

        <section className="admin-grid">
          <form className="panel admin-form" onSubmit={saveBot}>
            <div className="panel-heading">
              <div>
                <span><Bot size={16} /></span>
                <h2>{botForm.id ? "แก้ไข botlineOA" : "เพิ่ม botlineOA"}</h2>
              </div>
            </div>
            <label className="field-label">
              ชื่อ botlineOA
              <input
                value={botForm.name}
                onChange={(event) => setBotForm({ ...botForm, name: event.target.value })}
                placeholder="เช่น OA ฝ่ายขาย"
              />
            </label>
            <label className="field-label">
              Channel access token
              <input
                type="password"
                value={botForm.channelAccessToken}
                onChange={(event) => setBotForm({ ...botForm, channelAccessToken: event.target.value })}
                placeholder={botForm.id ? "เว้นว่างถ้าไม่เปลี่ยน" : "ใส่ token"}
                autoComplete="off"
              />
            </label>
            <label className="field-label">
              Channel secret
              <input
                type="password"
                value={botForm.channelSecret}
                onChange={(event) => setBotForm({ ...botForm, channelSecret: event.target.value })}
                placeholder={botForm.id ? "เว้นว่างถ้าไม่เปลี่ยน" : "ใส่ secret"}
                autoComplete="off"
              />
            </label>
            <label className="switch-row compact">
              <span>เปิดใช้งาน</span>
              <input
                type="checkbox"
                checked={botForm.isActive}
                onChange={(event) => setBotForm({ ...botForm, isActive: event.target.checked })}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
                {botForm.id ? "บันทึก botlineOA" : "เพิ่ม botlineOA"}
              </button>
              {botForm.id ? (
                <button className="secondary-button" type="button" onClick={resetBotForm}>
                  ยกเลิก
                </button>
              ) : null}
            </div>
          </form>

          <form className="panel admin-form" onSubmit={saveUser}>
            <div className="panel-heading">
              <div>
                <span><UsersRound size={16} /></span>
                <h2>{userForm.id ? "แก้ไข UserOA" : "เพิ่ม UserOA"}</h2>
              </div>
            </div>
            <label className="field-label">
              ชื่อ UserOA
              <input
                value={userForm.displayName}
                onChange={(event) => setUserForm({ ...userForm, displayName: event.target.value })}
                placeholder="เช่น ทีมแอดมิน A"
              />
            </label>
            <label className="field-label">
              Password
              <input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                placeholder={userForm.id ? "เว้นว่างถ้าไม่เปลี่ยน" : "ตั้งรหัสผ่าน"}
                autoComplete="off"
              />
            </label>
            <label className="switch-row compact">
              <span>เปิดใช้งาน</span>
              <input
                type="checkbox"
                checked={userForm.isActive}
                onChange={(event) => setUserForm({ ...userForm, isActive: event.target.checked })}
              />
            </label>
            <div className="assignment-box">
              <strong>มอบหมาย botlineOA</strong>
              <div className="assignment-list">
                {bots.length ? (
                  bots.map((botItem) => (
                    <label className="check-row assignment-row" key={botItem.id}>
                      <input
                        type="checkbox"
                        checked={userForm.botIds.includes(botItem.id)}
                        onChange={() => toggleUserBot(botItem.id)}
                      />
                      <span>{botItem.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="muted-text">ยังไม่มี botlineOA</p>
                )}
              </div>
            </div>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
                {userForm.id ? "บันทึก UserOA" : "เพิ่ม UserOA"}
              </button>
              {userForm.id ? (
                <button className="secondary-button" type="button" onClick={resetUserForm}>
                  ยกเลิก
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel admin-list-panel">
          <div className="panel-heading inline">
            <div>
              <span>1</span>
              <h2>botlineOA ทั้งหมด</h2>
            </div>
            <label className="search-box compact-search">
              <Search size={17} />
              <input
                value={botSearch}
                onChange={(event) => setBotSearch(event.target.value)}
                placeholder="ค้นหา botlineOA"
              />
            </label>
          </div>
          <div className="admin-card-grid">
            {filteredBots.length ? (
              filteredBots.map((botItem) => (
                <article className="admin-card" key={botItem.id}>
                  <div>
                    <strong>{botItem.name}</strong>
                    <span className={`settings-pill ${botItem.is_active ? "ready" : "missing"}`}>
                      {botItem.is_active ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="webhook-copy-row">
                    <code>{botItem.webhook_url}</code>
                    <button
                      className="secondary-button copy-button"
                      type="button"
                      onClick={() => copyWebhook(botItem.webhook_url)}
                    >
                      <Copy size={16} /> คัดลอก webhook
                    </button>
                  </div>
                  <div className="row-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        setBotForm({
                          id: botItem.id,
                          name: botItem.name,
                          channelAccessToken: "",
                          channelSecret: "",
                          isActive: botItem.is_active
                        })
                      }
                    >
                      <Pencil size={16} /> แก้ไข
                    </button>
                    <button className="ghost-button danger" type="button" onClick={() => deleteBot(botItem.id)}>
                      <Trash2 size={16} /> ปิดใช้งาน
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-history">ยังไม่มี botlineOA</div>
            )}
          </div>
        </section>

        <section className="panel admin-list-panel">
          <div className="panel-heading inline">
            <div>
              <span>2</span>
              <h2>UserOA</h2>
            </div>
          </div>
          <div className="user-table">
            {users.length ? (
              users.map((user) => (
                <div className="user-row" key={user.id}>
                  <div>
                    <strong>{user.display_name}</strong>
                    <span>{user.bot_ids.length} botlineOA</span>
                  </div>
                  <span className={`settings-pill ${user.is_active ? "ready" : "missing"}`}>
                    {user.is_active ? "active" : "inactive"}
                  </span>
                  <div className="row-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() =>
                        setUserForm({
                          id: user.id,
                          displayName: user.display_name,
                          password: "",
                          isActive: user.is_active,
                          botIds: user.bot_ids
                        })
                      }
                    >
                      <Pencil size={16} /> แก้ไข
                    </button>
                    <button className="ghost-button danger" type="button" onClick={() => deleteUser(user.id)}>
                      <Trash2 size={16} /> ปิดใช้งาน
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-history">ยังไม่มี UserOA</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function UserDashboard({ session, onLogout }) {
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState("");
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

  async function loadBots() {
    const result = await api.assignedBots();
    const assigned = result.bots || [];
    setBots(assigned);
    setSelectedBotId((current) => current || (assigned[0]?.id ? String(assigned[0].id) : ""));
  }

  async function loadBotData(botId = selectedBotId) {
    if (!botId) return;
    const [recipientData, campaignData, historyData] = await Promise.all([
      api.recipients(botId),
      api.campaign(botId),
      api.history(botId)
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
      } else {
        setSelectedImage(null);
      }
    }
  }

  useEffect(() => {
    loadBots().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (selectedBotId) {
      setStatus("");
      setError("");
      loadBotData(selectedBotId).catch((err) => setError(err.message));
    }
  }, [selectedBotId]);

  const filteredRecipients = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return recipients.filter((recipient) => {
      const matchType = filter === "all" || recipient.type === filter;
      const matchSearch = !keyword || recipient.display_name.toLowerCase().includes(keyword);
      return matchType && matchSearch;
    });
  }, [filter, recipients, search]);

  const selectedBot = bots.find((botItem) => String(botItem.id) === String(selectedBotId));
  const selectedCount = allRecipients ? recipients.length : selectedIds.length;
  const groupCount = recipients.filter((recipient) => recipient.type === "group").length;
  const userCount = recipients.filter((recipient) => recipient.type === "user").length;
  const successToday = history.filter((item) => item.status === "success").length;
  const failedToday = history.filter((item) => item.status === "failed").length;
  const hasContent = Boolean(messageText.trim() || selectedImage?.id);
  const canSend = selectedBotId && hasContent && selectedCount > 0 && !busy;

  function toggleRecipient(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedBotId) return;

    setUploading(true);
    setError("");
    setStatus("");

    try {
      const result = await api.uploadImage(selectedBotId, file);
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
      const result = await api.sendNow(selectedBotId, payload());
      setStatus(`ส่งแล้ว ${result.success} สำเร็จ, ${result.failed} ไม่สำเร็จ`);
      const historyData = await api.history(selectedBotId);
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
      await api.saveCampaign(selectedBotId, {
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
        <Header
          title="ส่งข้อความ LINE OA"
          subtitle={`UserOA: ${session.displayName || "UserOA"} | ${selectedBot?.name || "ยังไม่ได้เลือก botlineOA"}`}
          onRefresh={() => loadBotData()}
          onLogout={logout}
        >
          <select
            className="bot-select"
            value={selectedBotId}
            onChange={(event) => setSelectedBotId(event.target.value)}
          >
            {bots.map((botItem) => (
              <option key={botItem.id} value={botItem.id}>
                {botItem.name}
              </option>
            ))}
          </select>
        </Header>

        {!bots.length ? (
          <section className="panel empty-assignment">
            <Bot size={28} />
            <h2>ยังไม่มี botlineOA ที่ได้รับมอบหมาย</h2>
            <p>ให้ Admin assign botlineOA ให้ UserOA นี้ก่อน จึงจะเริ่มส่งข้อความได้</p>
          </section>
        ) : (
          <>
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
                  <span>ส่งให้ทั้งหมดที่ bot นี้รู้จัก ({recipients.length})</span>
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
                      <p>ยังไม่มีผู้รับจาก webhook ของ bot นี้</p>
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
                <button className="secondary-button" onClick={saveSchedule} disabled={busy || !selectedBotId}>
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
                <button className="ghost-button" onClick={() => loadBotData()}>ดูใหม่</button>
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
                    ยังไม่มีประวัติการส่งของ bot นี้
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  async function checkSession() {
    try {
      const result = await api.session();
      setSession(result.authenticated ? result : null);
    } catch {
      setSession(null);
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

  if (!session) {
    return <Login onLoggedIn={(nextSession) => setSession(nextSession)} />;
  }

  return session.role === "admin" ? (
    <AdminDashboard session={session} onLogout={() => setSession(null)} />
  ) : (
    <UserDashboard session={session} onLogout={() => setSession(null)} />
  );
}
