/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  ShieldCheck, 
  Key, 
  Copy, 
  RefreshCcw, 
  ShoppingBag, 
  UserCheck, 
  Mail, 
  MapPin, 
  AlertCircle, 
  CheckCircle,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CountryCombobox } from '../../components/CountryCombobox';
import { COUNTRIES, PROVINCES_BY_COUNTRY, findCountryByName, getCitiesForState, detectClientLocation } from '../../utils/affiliateGeo';
import { validateLegitEmail } from '../../lib/emailValidator';

const AccountSettings = () => {
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Transaction Keys State
  const [checkoutCodes, setCheckoutCodes] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState('');

  // Profile Details State (Defaulted to US)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('United States');
  const [stateProvince, setStateProvince] = useState('California');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [isAffiliate, setIsAffiliate] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      const emailVal = user.email || '';
      setUserEmail(emailVal);
      setEditEmail(emailVal);

      // 1. Fetch from fontbuyer (User Profile & Base Address), fallback to user metadata
      const { data: buyer } = await supabase
        .from('fontbuyer')
        .select('full_name, address, email')
        .eq('id', user.id)
        .maybeSingle();

      const resolvedFullName = buyer?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
      if (resolvedFullName) {
        setFullName(resolvedFullName);
      }

      if (buyer?.email && !emailVal) {
        setUserEmail(buyer.email);
        setEditEmail(buyer.email);
      }

      // 2. Fetch from affiliates to sync structured address if user is also an affiliate
      const { data: aff } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (aff) {
        setIsAffiliate(true);
        if (aff.country) setCountry(aff.country);
        if (aff.state_province) setStateProvince(aff.state_province);
        if (aff.city) setCity(aff.city);
        if (aff.postal_code) setPostalCode(aff.postal_code);
        if (aff.street_address) setStreetAddress(aff.street_address);
      } else if (buyer?.address) {
        // Fallback: If address is a single text string, prefill street address
        setStreetAddress(buyer.address);
      } else {
        // Auto-suggest country and province from client location
        detectClientLocation().then(geo => {
          setCountry(prev => (prev === 'United States' ? geo.country : prev));
          if (geo.stateProvince) {
            setStateProvince(prev => (prev === 'California' ? geo.stateProvince : prev));
          }
        }).catch(() => {});
      }

      // 3. Fetch purchase history transaction codes
      const { data: history } = await supabase
        .from('font_history')
        .select('transaction_id')
        .eq('user_id', user.id)
        .order('download_date', { ascending: false });

      if (history && history.length > 0) {
        const codes = history.map((item: any) => item.transaction_id);
        setCheckoutCodes(codes);
        setSelectedCode(codes[0]);
      }
    };

    loadUserData();
  }, []);

  const handleCountryChange = (selectedCountry: string) => {
    setCountry(selectedCountry);
    const provinces = PROVINCES_BY_COUNTRY[selectedCountry];
    if (provinces && provinces.length > 0) {
      setStateProvince(provinces[0]);
    } else {
      setStateProvince('');
    }
    setCity('');
  };

  const handleCopy = () => {
    if (!selectedCode) return;
    navigator.clipboard.writeText(selectedCode);
    alert("KEY COPIED TO ARCHIVE: " + selectedCode);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim()) {
      setProfileError('Full Name is required for your commercial license certificate.');
      return;
    }

    const cleanEmail = editEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setProfileError('Email address is required.');
      return;
    }

    // Layered Anti-Dummy Email Validation (Disposable domains, typos, live MX check)
    if (cleanEmail !== userEmail) {
      setProfileLoading(true);
      const emailCheck = await validateLegitEmail(cleanEmail);
      if (!emailCheck.isValid) {
        setProfileLoading(false);
        setProfileError(emailCheck.message || 'Disposable, fake, or invalid email address detected. Please provide a genuine email.');
        return;
      }
    }

    setProfileLoading(true);

    try {
      const fullAddress = [
        streetAddress.trim(),
        city.trim(),
        [stateProvince.trim(), postalCode.trim()].filter(Boolean).join(' '),
        country.trim()
      ].filter(Boolean).join(', ');

      // 1. Update fontbuyer profile (Primary buyer identity table)
      const { error: buyerError } = await supabase
        .from('fontbuyer')
        .upsert({
          id: currentUser.id,
          email: cleanEmail,
          full_name: fullName.trim(),
          address: fullAddress
        });

      if (buyerError) throw buyerError;

      // 2. Two-Way Sync: If user is also an affiliate, sync structured address to affiliates table
      if (isAffiliate) {
        await supabase
          .from('affiliates')
          .update({
            country: country.trim(),
            state_province: stateProvince.trim(),
            city: city.trim(),
            postal_code: postalCode.trim(),
            street_address: streetAddress.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', currentUser.id);
      }

      // 3. Update Supabase Auth user metadata & login credential if changed
      const authUpdatePayload: any = { data: { full_name: fullName.trim() } };
      if (cleanEmail !== userEmail) {
        authUpdatePayload.email = cleanEmail;
      }
      const { error: authError } = await supabase.auth.updateUser(authUpdatePayload);
      if (authError) throw authError;

      if (cleanEmail !== userEmail) {
        setUserEmail(cleanEmail);
        setProfileSuccess('Profile and login credentials updated successfully! Note: A confirmation link may have been sent to your new email. Your new info will apply to all future licenses, and you can re-download past licenses from Purchase History.');
      } else {
        setProfileSuccess('Account profile updated successfully! Your updated name and billing address will appear on future licenses, and you can re-download updated certificates from Purchase History.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update account details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess("Security password updated successfully!");
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  const provinceOptions = PROVINCES_BY_COUNTRY[country] || [];
  const cityOptions = getCitiesForState(country, stateProvince);

  return (
    <div className="max-w-3xl space-y-12 pb-20">
      {/* HEADER */}
      <div className="border-b border-vintage-ink pb-8">
        <h2 className="text-3xl md:text-5xl font-script capitalize text-vintage-ink">Account & Security</h2>
        <p className="text-xs font-bold tracking-widest text-vintage-accent uppercase mt-2 font-sans">
          Manage your purchaser profile, billing details, and security credentials
        </p>
      </div>

      {/* 1. ACCOUNT PROFILE & BILLING DETAILS CARD */}
      <div className="vintage-card bg-vintage-paper border border-vintage-ink/20 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-vintage-ink/20 pb-4">
          <div className="flex items-center gap-3">
            <UserCheck size={18} className="text-vintage-accent" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
              Purchaser & Billing Profile
            </h3>
          </div>
          {isAffiliate && (
            <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 bg-vintage-accent text-vintage-paper font-sans">
              Affiliate Partner Synced
            </span>
          )}
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-4 bg-white border border-vintage-ink/20 text-xs text-vintage-ink font-sans leading-relaxed space-y-2">
          <div className="flex items-start gap-2">
            <FileText size={16} className="text-vintage-accent shrink-0 mt-0.5" />
            <p>
              <strong>License Updates:</strong> Any changes made to your Full Name or Billing Address will automatically reflect on all future font licenses. You can also re-download previous font packages and updated license certificates at any time in your <Link to="/dashboard" onClick={() => window.location.hash = 'library'} className="underline font-bold text-vintage-accent hover:text-vintage-ink">Purchase History</Link>.
            </p>
          </div>
          <div className="flex items-start gap-2 pt-1 border-t border-vintage-ink/10">
            <Mail size={16} className="text-vintage-accent shrink-0 mt-0.5" />
            <p>
              <strong>Login Username:</strong> Your email address serves as your account login username. If you change your email, your previous email will immediately become invalid for signing in.
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-700 text-emerald-900 text-xs font-sans font-bold flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-700 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="p-4 bg-red-50 border border-red-800 text-red-900 text-xs font-sans font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-800 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                Legal Full Name *
              </label>
              <input 
                type="text" 
                value={fullName} 
                onChange={e => setFullName(e.target.value.replace(/\b\w/g, l => l.toUpperCase()))} 
                placeholder="e.g. Johnathan Doe" 
                required 
                className="w-full border border-vintage-ink/30 p-3 bg-white outline-none font-sans text-sm focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/40 text-vintage-ink"
              />
              <span className="text-[10px] text-vintage-ink/60 font-sans block">
                Printed as the licensee entity on commercial PDF receipts.
              </span>
            </div>

            {/* Email / Username */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                Account Email / Username *
              </label>
              <input 
                type="email" 
                value={editEmail} 
                onChange={e => setEditEmail(e.target.value.toLowerCase())} 
                placeholder="name@domain.com" 
                required 
                className="w-full border border-vintage-ink/30 p-3 bg-white outline-none font-sans text-sm focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/40 text-vintage-ink"
              />
              <span className="text-[10px] text-vintage-ink/60 font-sans block">
                Used to sign in. Real mailbox required (anti-dummy check active).
              </span>
            </div>
          </div>

          {/* Structured Address Section */}
          <div className="p-5 border border-vintage-ink/20 bg-vintage-background/60 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-vintage-accent block flex items-center gap-1.5 font-sans">
              <MapPin size={14} /> Commercial Billing Address
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                  Country
                </label>
                <CountryCombobox 
                  value={country} 
                  onChange={(c) => handleCountryChange(c)}
                  theme="vintage"
                />
              </div>

              {/* State / Province */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                  State / Province
                </label>
                {provinceOptions.length > 0 ? (
                  <select
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    className="w-full p-3 border border-vintage-ink/30 bg-white font-sans text-xs font-bold outline-none cursor-pointer text-vintage-ink"
                  >
                    {provinceOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder="State, Region, or Province" 
                    className="w-full p-3 border border-vintage-ink/30 bg-white font-sans text-xs font-bold outline-none text-vintage-ink placeholder:text-vintage-ink/40"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* City */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                  City / Municipality
                </label>
                <input 
                  type="text" 
                  list="account-city-list"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San Francisco" 
                  className="w-full p-3 border border-vintage-ink/30 bg-white font-sans text-xs font-bold outline-none text-vintage-ink placeholder:text-vintage-ink/40"
                />
                {cityOptions.length > 0 && (
                  <datalist id="account-city-list">
                    {cityOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                )}
              </div>

              {/* Postal / ZIP */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                  Postal / ZIP Code
                </label>
                <input 
                  type="text" 
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 94105" 
                  className="w-full p-3 border border-vintage-ink/30 bg-white font-sans text-xs font-bold outline-none text-vintage-ink placeholder:text-vintage-ink/40"
                />
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-vintage-ink block font-sans">
                Street Address / Suite / Building
              </label>
              <input 
                type="text" 
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. 525 Market St, Suite 3200" 
                className="w-full p-3 border border-vintage-ink/30 bg-white font-sans text-xs font-bold outline-none text-vintage-ink placeholder:text-vintage-ink/40"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={profileLoading} 
            className="vintage-btn btn-reverse w-full py-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-3 font-sans"
          >
            {profileLoading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <>
                <UserCheck size={16} /> SAVE PROFILE & BILLING DETAILS
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. ACCESSION / ORDER KEYS CARD */}
      <div className="vintage-card bg-vintage-paper border border-vintage-ink/20 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-vintage-ink/20 pb-4">
          <Key size={18} className="text-vintage-accent" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
            Order Transaction Keys
          </h3>
        </div>

        {checkoutCodes.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative grow">
              <select 
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full bg-vintage-paper border border-vintage-ink/30 p-3.5 outline-none appearance-none cursor-pointer font-mono font-bold text-base focus:border-vintage-accent transition-all text-vintage-ink shadow-xs"
              >
                {checkoutCodes.map((code: string, idx: number) => (
                  <option key={idx} value={code} className="bg-vintage-paper font-mono">{code}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vintage-ink/70">
                <RefreshCcw size={16} />
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handleCopy}
              className="vintage-btn px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-vintage-ink"
            >
              <Copy size={16} /> COPY KEY
            </button>
          </div>
        ) : (
          <div className="p-6 bg-white border border-vintage-ink/20 text-center space-y-3">
            <span className="text-[10px] font-bold tracking-widest uppercase text-vintage-accent block">
              No Purchased Fonts Recorded
            </span>
            <p className="text-xs text-vintage-ink/80 font-sans max-w-md mx-auto leading-relaxed">
              You haven't purchased any fonts under this account yet. License commercial typefaces to receive perpetual download access and valid order keys.
            </p>
            <div>
              <Link 
                to="/fonts" 
                className="vintage-btn btn-reverse inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider font-sans"
              >
                <ShoppingBag size={14} /> BUY FONTS NOW
              </Link>
            </div>
          </div>
        )}

        <div className="p-4 bg-white border border-vintage-ink/20 text-xs sm:text-sm text-vintage-ink font-sans leading-relaxed space-y-1">
          <p className="font-semibold text-vintage-ink">• All order keys listed correspond to your past font purchases.</p>
          <p className="text-vintage-ink/90">• If you ever need to verify account ownership or restore access, use any of your order transaction IDs.</p>
        </div>
      </div>

      {/* 3. CHANGE PASSWORD FORM */}
      <div className="vintage-card bg-vintage-paper border border-vintage-ink/20 shadow-xs">
        <form onSubmit={handleUpdatePassword} className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-vintage-ink/20 pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-vintage-accent" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-vintage-ink font-sans">
                Change Password
              </h3>
            </div>
            {userEmail && (
              <span className="text-xs font-mono text-vintage-ink/80 bg-vintage-ink/5 px-2.5 py-1 border border-vintage-ink/15 self-start sm:self-auto">
                Account: <strong className="text-vintage-ink">{userEmail}</strong>
              </span>
            )}
          </div>

          {passwordSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-700 text-emerald-900 text-xs font-sans font-bold flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-700 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-4 bg-red-50 border border-red-800 text-red-900 text-xs font-sans font-bold flex items-center gap-2">
              <AlertCircle size={16} className="text-red-800 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">New Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className="w-full border border-vintage-ink/30 p-3 bg-white outline-none font-sans text-base focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/50 text-vintage-ink"
                placeholder="Enter new password..."
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-vintage-ink block font-sans">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full border border-vintage-ink/30 p-3 bg-white outline-none font-sans text-base focus:border-vintage-accent transition-colors placeholder:text-vintage-ink/50 text-vintage-ink"
                placeholder="Verify new password..."
                required 
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={passwordLoading} 
            className="vintage-btn btn-reverse w-full py-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-3 font-sans"
          >
            {passwordLoading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <>
                <ShieldCheck size={16} /> UPDATE PASSWORD
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSettings;