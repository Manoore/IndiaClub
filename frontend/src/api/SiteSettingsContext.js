import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "./client";

// Default values used as fallback while loading and if the API is unreachable.
// These mirror the SiteSettings defaults on the backend.
const DEFAULTS = {
  site_name: "India Club of Greater Dayton",
  contact_email: "contact@indiaclubdayton.org",
  contact_phone: "(937) 314-8870",
  contact_address: "Dayton, OH",
  social_facebook: "",
  social_twitter: "",
  social_instagram: "",
  social_youtube: "",
  home_hero_eyebrow: "SINCE 1967",
  home_hero_title: "India Club of Greater Dayton",
  home_hero_subtitle:
    "A vibrant home for 1000+ Indian-American families — celebrating heritage, culture and community for 58 years and counting.",
  home_hero_cta_primary: "Become a Member",
  home_hero_cta_secondary: "Explore Events",
  home_hero_image: "",
  home_stat_1_value: "1967",
  home_stat_1_label: "Founded",
  home_stat_2_value: "1000+",
  home_stat_2_label: "Families",
  home_stat_3_value: "40+",
  home_stat_3_label: "Events / Year",
  home_why_join_title: "Why join India Club?",
  home_why_join_text:
    "Members enjoy discounted tickets to all our cultural events, voting rights at the AGM, a quarterly newsletter, and the unmatched joy of belonging to a 1000+ family Indian community in the heart of Ohio.",
  about_mission:
    "India Club of Greater Dayton is dedicated to preserving and promoting Indian heritage, culture, and community values.",
  about_history:
    "Founded in 1967, ICGD has been the cornerstone of the Indian-American community in Dayton, Ohio.",
  footer_tagline: "Celebrating Indian heritage, culture, and community since 1967.",
  footer_copyright: "© 2026 India Club of Greater Dayton. All rights reserved.",
  honorary_contact_email: "president@indiaclubdayton.org",
};

const SiteSettingsContext = createContext({ settings: DEFAULTS, loading: true });

export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get("/site-settings")
      .then((r) => {
        if (mounted && r.data) {
          // Merge with defaults so missing fields don't blow up
          setSettings({ ...DEFAULTS, ...r.data });
        }
      })
      .catch(() => {
        // Keep defaults; site still renders
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext).settings;
export const useSiteSettingsRaw = () => useContext(SiteSettingsContext);
