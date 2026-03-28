'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Settings, QrCode, Globe, Check } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { getAuthUser } from '@/app/actions/auth';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState(null);
  
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

    const { data: pData } = await supabase.from('pharmacies').select('*').eq('user_id', user.id).single();
    if (pData) {
      setPharmacy(pData);
      setLanguage(pData.language || 'en');
      setPaymentRequired(pData.payment_required || false);
      setTokenFee(pData.token_fee || '');
      setQrPreview(pData.upi_qr_url || null);
    }
    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    let qrUrl = pharmacy.upi_qr_url;

    // Handle QR upload if changed
    if (qrFile) {
      setQrUploading(true);
      const fileExt = qrFile.name.split('.').pop();
      const fileName = `${pharmacy.id}-${Math.random()}.${fileExt}`;
      const filePath = `qr/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('upi-qr')
        .upload(filePath, qrFile, { upsert: true });

      if (uploadError) {
        console.error('Error uploading QR:', uploadError);
        setMessage({ type: 'error', text: 'Failed to upload QR. Please ensure storage bucket "upi-qr" exists.' });
        setQrUploading(false);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('upi-qr').getPublicUrl(filePath);
      qrUrl = publicUrlData.publicUrl;
      setQrUploading(false);
    }

    // Update Profile
    const { error: updateError } = await supabase.from('pharmacies').update({
      language,
      payment_required: paymentRequired,
      token_fee: tokenFee ? parseFloat(tokenFee) : 0,
      upi_qr_url: qrUrl
    }).eq('id', pharmacy.id);

    if (updateError) {
      setMessage({ type: 'error', text: updateError.message });
    } else {
      setMessage({ type: 'success', text: t('settingsSaved', language) });
      fetchData(); // refresh pref
    }
    
    setSaving(false);
  };

  const handleQrChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setQrFile(file);
    const objectUrl = URL.createObjectURL(file);
    setQrPreview(objectUrl);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" color="var(--primary)" size={32} /></div>;

  if (!pharmacy) {
    // If the database insert failed during signup (due to confirm-email delay), 
    // we let the user provide the missing fields here now that they are fully logged in.
    const handleCompleteProfile = async (e) => {
      e.preventDefault();
      setSaving(true);
      const user = await getAuthUser();
      const { error } = await supabase.from('pharmacies').insert([{
        user_id: user.id,
        name: e.target.name.value,
        town: e.target.town.value,
        phone: e.target.phone.value,
      }]);
      if (!error) {
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: error.message });
      }
      setSaving(false);
    };

    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <div className="card glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)', textAlign: 'center' }}>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>We need a few details about your pharmacy to finish your setup!</p>
          
          {message && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleCompleteProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="name">Pharmacy Name</label>
              <input id="name" name="name" type="text" className="form-input" required placeholder="Town Medicals" />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label" htmlFor="town">Town / City</label>
                <input id="town" name="town" type="text" className="form-input" required placeholder="Salem" />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label className="form-label" htmlFor="phone">Phone Number</label>
                <input id="phone" name="phone" type="tel" className="form-input" required placeholder="+91..." />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.875rem' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pref = pharmacy?.language || 'en';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>{t('settings', pref)}</h1>
      </div>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '2rem', borderRadius: 'var(--radius-md)', backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: message.type === 'error' ? 'var(--danger)' : 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {message.type === 'success' && <Check size={20} />} 
          {message.text}
        </div>
      )}

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        
        {/* Localization & Profile */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="var(--primary)" />
              {t('languageSettings', pref)}
            </h2>

            <div className="form-group">
              <label className="form-label">{t('language', pref)} Preference</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="radio" name="lang" value="en" checked={language === 'en'} onChange={() => setLanguage('en')} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                  {t('englishOnly', pref)}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="radio" name="lang" value="ta" checked={language === 'ta'} onChange={() => setLanguage('ta')} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                  {t('tamilOnly', pref)}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="radio" name="lang" value="both" checked={language === 'both'} onChange={() => setLanguage('both')} style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)' }} />
                  {t('bilingual', pref)}
                </label>
              </div>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
              This defines the language shown on pharmacy interfaces, generated SMS/WhatsApp messages, and the public token status link for patients.
            </p>
          </div>
        </div>

        {/* Payments & QR */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={20} color="var(--secondary)" />
              {t('paymentSettings', pref)}
            </h2>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                id="reqPayment" 
                type="checkbox" 
                checked={paymentRequired} 
                onChange={(e) => setPaymentRequired(e.target.checked)} 
                style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="reqPayment" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                {t('paymentRequired', pref)}
              </label>
            </div>

            {paymentRequired && (
              <div className="form-group animate-fade-in" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">{t('tokenFee', pref)}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                  <input type="number" min="0" step="1" className="form-input" style={{ paddingLeft: '2rem' }} value={tokenFee} onChange={e => setTokenFee(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <label className="form-label" style={{ marginBottom: '1rem' }}>{t('uploadUpiQr', pref)}</label>
              
              {qrPreview && (
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <img src={qrPreview} alt="QR Preview" style={{ width: '200px', height: '200px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.5rem', backgroundColor: 'white' }} />
                </div>
              )}
              
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <button type="button" className="btn btn-outline" style={{ pointerEvents: 'none' }}>
                  <QrCode size={16} /> {qrPreview ? t('changeQr', pref) : t('uploadUpiQr', pref)}
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleQrChange}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Upload PhonePe, GPay, or Paytm QR.</p>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} disabled={saving || qrUploading}>
              {saving || qrUploading ? <Loader2 className="animate-spin" size={24} /> : <>{t('save', pref)} Config</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
