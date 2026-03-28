'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Settings, QrCode, Globe, Check, User, MapPin, Send } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { getAuthUser } from '@/app/actions/auth';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  const [towns, setTowns] = useState([]);
  
  // Profile Request state
  const [profileData, setProfileData] = useState({ name: '', phone: '', town_id: '' });
  const [pendingRequest, setPendingRequest] = useState(null);
  
  // Settings state
  const [language, setLanguage] = useState('en');
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [tokenFee, setTokenFee] = useState('');
  
  // QR state
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);
  
  const [message, setMessage] = useState(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const user = await getAuthUser();
    if (!user) return;

    // Fetch Towns
    const { data: tData } = await supabase.from('towns').select('*').eq('is_active', true).order('name');
    setTowns(tData || []);

    const { data: pData } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
    if (pData) {
      setPharmacy(pData);
      setProfileData({ name: pData.name || '', phone: pData.phone || '', town_id: pData.town_id || '' });
      setLanguage(pData.language || 'en');
      setPaymentRequired(pData.payment_required || false);
      setTokenFee(pData.token_fee || '');
      setQrPreview(pData.upi_qr_url || null);
      
      // Check for pending requests
      const { data: reqData } = await supabase.from('pharmacy_edit_requests')
        .select('*')
        .eq('pharmacy_id', pData.id)
        .eq('status', 'pending')
        .maybeSingle();
      setPendingRequest(reqData);
    }
    setLoading(false);
  };

  const handleRequestProfileUpdate = async (e) => {
    e.preventDefault();
    setRequesting(true);
    
    // Create Request
    const { error } = await supabase.from('pharmacy_edit_requests').insert([{
      pharmacy_id: pharmacy.id,
      suggested_name: profileData.name,
      suggested_phone: profileData.phone,
      suggested_town_id: profileData.town_id,
      suggested_town_name: towns.find(t => t.id === profileData.town_id)?.name || ''
    }]);

    if (error) setMessage({ type: 'error', text: error.message });
    else {
      setMessage({ type: 'success', text: 'Profile update request sent to platform admin.' });
      fetchData();
    }
    setRequesting(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    let qrUrl = pharmacy.upi_qr_url;

    if (qrFile) {
      setQrUploading(true);
      const fileExt = qrFile.name.split('.').pop();
      const filePath = `qr/${pharmacy.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('upi-qr').upload(filePath, qrFile, { upsert: true });
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('upi-qr').getPublicUrl(filePath);
        qrUrl = publicUrlData.publicUrl;
      }
      setQrUploading(false);
    }

    const { error: updateError } = await supabase.from('pharmacies').update({
      language,
      payment_required: paymentRequired,
      token_fee: tokenFee ? parseFloat(tokenFee) : 0,
      upi_qr_url: qrUrl
    }).eq('id', pharmacy.id);

    if (updateError) setMessage({ type: 'error', text: updateError.message });
    else {
      setMessage({ type: 'success', text: t('settingsSaved', language) });
      fetchData();
    }
    setSaving(false);
  };

  const pref = pharmacy?.language || 'en';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>;

  return (
    <div className="animate-fade-in">
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem' }}>{t('settings', pref)}</h1>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '2rem', borderRadius: 'var(--radius-md)', backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.type === 'error' ? 'var(--danger)' : 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={20} /> {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* LEFT COLUMN: Profile Requests */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--primary)" /> Pharmacy Profile Details
            </h2>
            
            {pendingRequest && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                <strong style={{ color: 'var(--warning)' }}>Pending Approval:</strong> Admin is reviewing your change request for: 
                <div style={{marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--warning)'}}>
                   {pendingRequest.suggested_name && <div>• Name: {pendingRequest.suggested_name}</div>}
                   {pendingRequest.suggested_town_name && <div>• Town: {pendingRequest.suggested_town_name}</div>}
                </div>
              </div>
            )}

            <form onSubmit={handleRequestProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Pharmacy Legal Name</label>
                <input type="text" className="form-input" disabled={!!pendingRequest} value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} required />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input type="tel" className="form-input" disabled={!!pendingRequest} value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} required />
              </div>

              <div className="form-group">
                <label className="form-label">Operating Town</label>
                <select className="form-select" disabled={!!pendingRequest} value={profileData.town_id} onChange={e => setProfileData({...profileData, town_id: e.target.value})}>
                  {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-outline btn-sm" disabled={requesting || !!pendingRequest} style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '1rem' }}>
                {requesting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16}/> Request Profile Update</>}
              </button>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center'}}>Name and Town changes require admin verification.</p>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Functional Settings */}
        <div style={{ flex: '1 1 400px' }}>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={20} color="var(--primary)" /> {t('languageSettings', pref)}
              </h2>
              {['en', 'ta', 'both'].map(l => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
                  <input type="radio" name="lang" value={l} checked={language === l} onChange={() => setLanguage(l)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                  {l === 'en' ? t('englishOnly', pref) : l === 'ta' ? t('tamilOnly', pref) : t('bilingual', pref)}
                </label>
              ))}
            </div>

            <div className="card glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={20} color="var(--secondary)" /> {t('paymentSettings', pref)}
              </h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={paymentRequired} onChange={e => setPaymentRequired(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                {t('paymentRequired', pref)}
              </label>

              {paymentRequired && (
                <div className="form-group animate-fade-in">
                  <label className="form-label">{t('tokenFee', pref)} (₹)</label>
                  <input type="number" min="0" className="form-input" value={tokenFee} onChange={e => setTokenFee(e.target.value)} />
                </div>
              )}

              <div style={{ textAlign: 'center', padding: '1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                {qrPreview && <img src={qrPreview} alt="QR" style={{ width: '150px', height: '150px', objectFit: 'contain', margin: '0 auto 1rem auto', display: 'block' }} />}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                   <button type="button" className="btn btn-outline btn-sm">Upload UPI QR</button>
                   <input type="file" accept="image/*" onChange={e => {
                     const file = e.target.files[0];
                     setQrFile(file);
                     setQrPreview(URL.createObjectURL(file));
                   }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.125rem' }} disabled={saving || qrUploading}>
              {saving ? <Loader2 className="animate-spin" size={24} /> : <>Save Configuration</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
