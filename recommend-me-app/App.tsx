/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useState, useContext, createContext, useEffect, useRef, useMemo, use } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, ScrollView, Modal, Pressable, TextInput, Animated, Dimensions } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTranslation } from 'react-i18next';
import i18n, { detectLanguage, detectRegion } from './src/i18n';
import { COLORS } from './src/theme';
import { extractYouTubeId } from './src/youtube';
import TrailerPlayer from './src/TrailerPlayer';

const localTest = Platform.OS === 'web'
  ? ''
  : 'http://188.166.155.92';

// Default region sent to the backend (country_code) when the device locale
// exposes no region. The API requires a country_code for provider availability.
const DEFAULT_COUNTRY_CODE = 'US';
const MAX_YEAR = 2025;
const MIN_YEAR = 2020;

const Stack = createNativeStackNavigator();

const GenresContext = createContext({
  genres: [] as any[],
  setGenres: (genres: any[]) => { }
});

const GenresListContext = createContext({
  genresList: [] as string[],
  setGenresList: (genres: string[]) => { }
});

const StackContext = createContext({
  stack: [] as any[],
  pushToStack: (item: any) => { },
  removeFromStack: (id: any) => { },
  clearStack: () => { }
});

const PairContext = createContext({
  pair: [] as any[],
  setPair: (pair: any) => { },
  clearPair: () => { }
});

const VectorContext = createContext({
  vector: [] as number[],
  setVector: (vector: number[]) => { },
  clearVector: () => { }
});

const FiltersContext = createContext({
  selectedGenres: null as string[] | null,
  setSelectedGenres: (vals: string[] | null) => { },
  minYear: '',
  setMinYear: (val: string) => { },
  maxYear: '',
  setMaxYear: (val: string) => { },
  // Story 3 side-panel filters. Providers/languages/country use lookup lists;
  // actors/directors are stored as {id, name} so chips can show the name while
  // only the id is sent to the API.
  // Providers/languages use the chip-cloud "all" sentinel: null = all/unfiltered,
  // [] = none, non-empty array = explicit subset. Both null and [] mean
  // "no constraint" when building the request.
  selectedProviders: null as number[] | null,
  setSelectedProviders: (vals: number[] | null) => { },
  selectedLanguages: null as string[] | null,
  setSelectedLanguages: (vals: string[] | null) => { },
  selectedCountry: '' as string,
  setSelectedCountry: (val: string) => { },
  selectedActors: [] as any[],
  setSelectedActors: (vals: any[]) => { },
  selectedDirectors: [] as any[],
  setSelectedDirectors: (vals: any[]) => { },
});

// Lookup lists for the filter side panel (providers / countries / languages),
// fetched once on mount alongside genres.
const FilterOptionsContext = createContext({
  providers: [] as any[],
  countries: [] as any[],
  languages: [] as any[],
});

// Holds only the filter side-panel open/close state, lifted to App() level so the
// nav-bar FilterTrigger (rendered by the navigator, outside SelectionScreen) can
// open the panel that SelectionScreen renders.
const FilterUIContext = createContext({
  isPanelOpen: false,
  openPanel: () => { },
  closePanel: () => { },
});

const LocaleContext = createContext({
  language: 'en',
  setLanguage: (_lng: string) => { },
  region: '',
});

// Single source of truth for the active side-panel filter count (badge on the
// nav-bar FilterTrigger). Providers/languages count only when an explicit
// non-empty subset is chosen (null = all and [] = none both count as 0);
// country counts when set; actors/directors by length.
function countExtraFilters(filters: {
  selectedProviders: number[] | null;
  selectedLanguages: string[] | null;
  selectedCountry: string;
  selectedActors: any[];
  selectedDirectors: any[];
}): number {
  const providerCount = Array.isArray(filters.selectedProviders) ? filters.selectedProviders.length : 0;
  const languageCount = Array.isArray(filters.selectedLanguages) ? filters.selectedLanguages.length : 0;
  return (
    providerCount +
    languageCount +
    (filters.selectedActors || []).length +
    (filters.selectedDirectors || []).length +
    (filters.selectedCountry ? 1 : 0)
  );
}

// Emoji for each genre so the filter chips are easier to scan. Keyed by lowercase
// TMDB genre name; unknown genres fall back to a clapperboard.
const GENRE_ICONS: { [k: string]: string } = {
  action: '💥', adventure: '🧭', animation: '🎨', comedy: '😂', crime: '🔫',
  documentary: '🎥', drama: '🎭', family: '👨‍👩‍👧', fantasy: '🐉', history: '📜',
  horror: '👻', music: '🎵', mystery: '🕵️', romance: '❤️', 'science fiction': '🚀',
  'sci-fi': '🚀', 'tv movie': '📺', thriller: '🔪', war: '⚔️', western: '🤠',
};
const genreIcon = (name: any): string => GENRE_ICONS[String(name || '').toLowerCase()] || '🎬';

// Flag emoji from an ISO 3166-1 alpha-2 country code (regional indicator letters).
// Renders as a flag on iOS/Android; some platforms (e.g. desktop Chrome) show the
// two letters instead, which is still a fine label prefix.
const flagEmoji = (code: any): string => {
  const cc = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
};

// --- CUSTOM COMPONENTS ---
const CinemaButton = ({ title, onPress, type = 'primary', width }: any) => {
  const isPrimary = type === 'primary';
  const glowHex = isPrimary ? COLORS.gold : COLORS.blue;
  const widthStyle = width ? { width } : undefined;
  return (
    <Pressable onPress={onPress} style={widthStyle}>
      {({ pressed }) => (
        <Shadow
          distance={pressed ? 18 : 10}
          startColor={glowHex + (pressed ? 'CC' : '99')}
          endColor={glowHex + '00'}
          offset={[0, 0]}
          style={widthStyle}
        >
          <View style={[
            styles.cinemaBtn,
            isPrimary ? styles.btnPrimary : styles.btnSecondary,
            widthStyle,
          ]}>
            <View style={[
              styles.btnInnerBorder,
              isPrimary ? styles.btnInnerPrimary : styles.btnInnerSecondary
            ]}>
              <Text style={[
                styles.btnText,
                isPrimary ? styles.textGold : styles.textWhite
              ]}>
                {title.toUpperCase()}
              </Text>
            </View>
          </View>
        </Shadow>
      )}
    </Pressable>
  );
};

const PosterButton = ({ imageUri, onPress }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: '100%',
        aspectRatio: 2 / 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: COLORS.cardBg,
        borderRadius: 8,
        padding: 4,
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

const MarqueeHeader = ({
  text,
  containerStyle,
  variant = 'red',
}: { text: string; containerStyle?: any; variant?: 'red' | 'blue' }) => {
  const isBlue = variant === 'blue';
  return (
    <View style={[
      styles.marqueeContainer,
      isBlue && styles.marqueeContainerBlue,
      containerStyle,
    ]}>
      <View style={[styles.marqueeBorder, isBlue && styles.marqueeBorderBlue]}>
        <Text style={[styles.marqueeText, isBlue && styles.marqueeTextBlue]}>
          {text}
        </Text>
      </View>
    </View>
  );
};

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

function LanguageSwitcher() {
  const { language, setLanguage } = useContext(LocaleContext);
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.langTrigger}
        activeOpacity={0.7}
      >
        <Text style={styles.langTriggerText}>🌐 {language.toUpperCase()}</Text>
      </TouchableOpacity>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.langCard}>
            {LANGUAGE_OPTIONS.map(({ code, label }) => (
              <TouchableOpacity
                key={code}
                style={styles.langRow}
                onPress={() => { setLanguage(code); setIsOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.langRowText, language === code && styles.langRowTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Nav-bar trigger that opens the filter menu, mirroring LanguageSwitcher's
// gold-on-red glyph styling. Badge reuses filtersBadge*; count via the shared
// countExtraFilters helper so it stays in sync with SelectionScreen.
function FilterTrigger() {
  const { openPanel } = useContext(FilterUIContext);
  const {
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  } = useContext(FiltersContext);
  const count = countExtraFilters({
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  });
  return (
    <TouchableOpacity
      onPress={openPanel}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.langTrigger}
      activeOpacity={0.7}
    >
      <Text style={styles.langTriggerText}>▤</Text>
      {count > 0 && (
        <View style={styles.filtersBadge}>
          <Text style={styles.filtersBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Nav-bar trigger that jumps to the Recommendations screen, mirroring
// FilterTrigger / LanguageSwitcher's gold-on-red glyph styling. Lives where the
// FilterTrigger used to (headerRight), now that filters moved to headerLeft.
function RecommendationsTrigger() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Recommendations')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.langTrigger}
      activeOpacity={0.7}
      accessibilityLabel={t('see_recommendations')}
    >
      <Text style={styles.langTriggerText}>🍿</Text>
    </TouchableOpacity>
  );
}

// Nav-bar magnifying-glass that opens the dedicated Search screen. Sits in
// headerLeft, to the right of the filter icon and left of the centered title.
// Replaces the old on-screen search box so the selection screen fits one screen.
function SearchTrigger() {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('SearchResults', { query: '', mode: 'movie' })}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.langTrigger}
      activeOpacity={0.7}
      accessibilityLabel={t('search_placeholder')}
    >
      <Text style={styles.langTriggerText}>🔍</Text>
    </TouchableOpacity>
  );
}

function MovieCard({ movieData }: { movieData: any }) {
  const { t } = useTranslation();
  const [posterWidth, setPosterWidth] = useState<number>(0);
  return (
    <View style={styles.movieCard}>
      <View style={{ height: 50, justifyContent: 'flex-end', alignItems: 'center', width: '100%', paddingBottom: 10 }}>
        <Text style={[styles.textGold, styles.text, { textAlign: 'center', marginBottom: 0 }]} numberOfLines={2} adjustsFontSizeToFit>{movieData.name}</Text>
      </View>
      <View
        style={{ width: '100%' }}
        onLayout={(e) => setPosterWidth(e.nativeEvent.layout.width)}
      >
        <PosterButton
          imageUri={movieData.image}
          onPress={() => {
            // Changed to pass the entire movieData object instead of just the name
            movieData.selectionHandler(movieData)
          }}
        />
      </View>
      <CinemaButton
        title={t('details')}
        type="secondary"
        width={posterWidth || undefined}
        onPress={() => movieData.detailsHandler(movieData)}
      />
    </View>
  );
}

// Leading chip logo that falls back to a 📺 glyph when the image is missing or
// fails to load. (The backend's provider logo_urls currently 404, so this shows
// 📺 for now; real logos appear automatically once the backend serves them.)
function ChipLogo({ uri, fallback = '📺' }: any) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return <Text style={styles.chipIconFallback}>{fallback}</Text>;
  }
  return (
    <Image source={{ uri }} style={styles.chipIcon} resizeMode="contain" onError={() => setFailed(true)} />
  );
}

// Genre-style chip-cloud multi-select. `selectedValues` uses the "all" sentinel:
// null = all selected, [] = none, non-empty array = explicit subset.
// `getValue`/`getLabel` default to identity so plain-string usage (genres) keeps
// working; pass them to drive object-based lookup lists (providers/languages).
const CinemaMultiSelectModal = ({
  label,
  options,
  selectedValues,
  onChange,
  getValue = (o: any) => o,
  getLabel = (o: any) => o,
  getImage = (_o: any) => null, // optional leading logo URL per chip (e.g. providers)
}: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const allSelected = selectedValues === null;
  const noneSelected = Array.isArray(selectedValues) && selectedValues.length === 0;
  const isChecked = (opt: any) => allSelected || (selectedValues || []).includes(getValue(opt));

  const toggle = (opt: any) => {
    const val = getValue(opt);
    let next: any[];
    if (allSelected) {
      next = options.map(getValue).filter((v: any) => v !== val);
    } else if (selectedValues.includes(val)) {
      next = selectedValues.filter((v: any) => v !== val);
    } else {
      next = [...selectedValues, val];
    }
    if (next.length === options.length) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  const selectAll = () => onChange(null);
  const selectNone = () => onChange([]);

  // Label shown for the single-selected case: find the option whose value matches.
  const singleLabel = () => {
    const opt = options.find((o: any) => getValue(o) === selectedValues[0]);
    return opt !== undefined ? getLabel(opt) : String(selectedValues[0]);
  };

  const valueText = allSelected
    ? `${t('filter_all')} ▼`
    : noneSelected
      ? `${t('filter_any')} ▼`
      : selectedValues.length === 1
        ? singleLabel()
        : t('filter_selected', { count: selectedValues.length });

  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontFamily: 'Oswald-Bold' }}>{label}: </Text>
          {valueText}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.chipCloud}>
              {options.map((opt: any) => {
                const checked = isChecked(opt);
                const img = getImage(opt);
                return (
                  <TouchableOpacity
                    key={String(getValue(opt))}
                    style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => toggle(opt)}
                    activeOpacity={0.7}
                  >
                    {img ? <ChipLogo uri={img} /> : null}
                    <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {getLabel(opt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_select_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectNone}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_deselect_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>{t('filter_done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// --- FILTER SIDE PANEL HELPERS ---

// Each filter category below opens its OWN popup, all built on the same template
// as CinemaMultiSelectModal: a `dropdownHeader` trigger row showing the current
// value, and a fade Modal with a `modalCard` body and a `modalActions` footer
// (the "min/max" select helpers where relevant, plus Done).

// Year range in a single popup named "Year": both scroll wheels (min + max)
// side by side + Done. The wheels stay scrollable.
const CinemaYearRangeModal = ({ label, minYear, maxYear, min, max, onChangeMin, onChangeMax }: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const rangeText = `${minYear || '—'}–${maxYear || '—'}`;
  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontFamily: 'Oswald-Bold' }}>{label}: </Text>
          {rangeText} ▼
        </Text>
      </TouchableOpacity>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.filtersContainerBottom}>
              <CinemaYearWheel label={t('filter_min_year')} value={minYear} min={min} max={max} onChange={onChangeMin} />
              <CinemaYearWheel label={t('filter_max_year')} value={maxYear} min={min} max={max} onChange={onChangeMax} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>{t('filter_done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Single-select lookup (Country) in its own popup: chips + Clear (the "min"
// helper, back to no selection) + Done.
const CinemaSingleSelectModal = ({ label, options, selectedValue, getValue, getLabel, onChange }: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selectedOpt = options.find((o: any) => getValue(o) === selectedValue);
  const valueText = selectedValue && selectedOpt ? getLabel(selectedOpt) : `${t('filter_any')} ▼`;
  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontFamily: 'Oswald-Bold' }}>{label}: </Text>
          {valueText}
        </Text>
      </TouchableOpacity>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.chipCloud}>
              {options.map((opt: any) => {
                const checked = getValue(opt) === selectedValue;
                return (
                  <TouchableOpacity
                    key={String(getValue(opt))}
                    style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
                    onPress={() => onChange(getValue(opt))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                      {getLabel(opt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => onChange('')}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_deselect_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>{t('filter_done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Cast / Directors typeahead in its own popup: the existing typeahead body +
// Clear All (min) + Done.
const CinemaTypeaheadModal = ({ label, selected, onChange, endpoint, selectedParam }: any) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const count = (selected || []).length;
  const valueText = count === 0 ? `${t('filter_any')} ▼` : t('filter_selected', { count });
  return (
    <View style={styles.genreTriggerWrap}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownHeaderText}>
          <Text style={{ fontFamily: 'Oswald-Bold' }}>{label}: </Text>
          {valueText}
        </Text>
      </TouchableOpacity>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <PanelTypeahead
              label={label}
              selected={selected}
              onChange={onChange}
              endpoint={endpoint}
              selectedParam={selectedParam}
              inModal
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => onChange([])}>
                <Text style={[styles.modalAction, { color: COLORS.primaryRed }]}>{t('filter_deselect_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Text style={[styles.modalAction, { color: COLORS.gold }]}>{t('filter_done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Single-select for lookup lists (used by Country).
const PanelSingleSelect = ({ label, options, selectedValue, getValue, getLabel, onChange }: any) => {
  return (
    <View style={styles.panelSection}>
      <Text style={styles.panelSectionTitle}>{label}</Text>
      <View style={styles.chipCloud}>
        {options.map((opt: any) => {
          const val = getValue(opt);
          const checked = val === selectedValue;
          return (
            <TouchableOpacity
              key={String(val)}
              style={[styles.chip, checked ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => onChange(val)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, checked ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {getLabel(opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Min characters before a typeahead query fires, debounce window, and the cap on
// rendered suggestions.
const TYPEAHEAD_MIN_CHARS = 2;
const TYPEAHEAD_DEBOUNCE_MS = 300;
const TYPEAHEAD_MAX_RESULTS = 8;

// Debounced typeahead multi-select used for both Cast and Directors. `selected`
// is an array of {id, name}; only ids are sent to the search endpoint and (later)
// to the movie request. `endpoint` is the search path; `selectedParam` is the
// query-string key that carries already-selected ids back to the server.
const PanelTypeahead = ({ label, selected, onChange, endpoint, selectedParam, inModal }: any) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<any>(null);

  const selectedIds = (selected || []).map((s: any) => s.id);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < TYPEAHEAD_MIN_CHARS) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(() => {
      const selectedEncoded = encodeURIComponent('[' + selectedIds.join(',') + ']');
      const url = `${localTest}${endpoint}?q=${encodeURIComponent(query.trim())}&${selectedParam}=${selectedEncoded}`;
      fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json())
        .then(json => {
          const list = Array.isArray(json) ? json : (json?.data || []);
          setResults(list.slice(0, TYPEAHEAD_MAX_RESULTS));
          setSearching(false);
        })
        .catch(err => {
          console.error('Typeahead search failed', err);
          setResults([]);
          setSearching(false);
        });
    }, TYPEAHEAD_DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // selectedIds is derived from `selected`; depending on it would refire on each pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const addPerson = (person: any) => {
    if (!selectedIds.includes(person.id)) {
      onChange([...(selected || []), { id: person.id, name: person.name }]);
    }
    setQuery('');
    setResults([]);
  };

  const removePerson = (id: any) => {
    onChange((selected || []).filter((s: any) => s.id !== id));
  };

  return (
    <View style={styles.panelSection}>
      {!inModal && <Text style={styles.panelSectionTitle}>{label}</Text>}

      {(selected || []).length > 0 && (
        <View style={styles.chipCloud}>
          {(selected || []).map((person: any) => (
            <TouchableOpacity
              key={String(person.id)}
              style={[styles.chip, styles.chipSelected]}
              onPress={() => removePerson(person.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, styles.chipTextSelected]}>{person.name}  ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TextInput
        style={styles.panelInput}
        placeholder={t('filter_search_placeholder')}
        placeholderTextColor={COLORS.borderDark}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="words"
      />

      {searching && <Text style={styles.panelHint}>{t('filter_searching')}</Text>}
      {!searching && query.trim().length >= TYPEAHEAD_MIN_CHARS && results.length === 0 && (
        <Text style={styles.panelHint}>{t('filter_no_results')}</Text>
      )}

      {results.map((person: any) => (
        <TouchableOpacity
          key={String(person.id)}
          style={styles.typeaheadResult}
          onPress={() => addPerson(person)}
          activeOpacity={0.7}
        >
          <Text style={styles.typeaheadResultName}>{person.name}</Text>
          {person.movie_count != null && (
            <Text style={styles.typeaheadResultMeta}>
              {t('filter_movie_count', { count: person.movie_count })}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Dropdown menu hosting the Story 3 filters (providers / language / country
// / cast / directors). Mirrors LanguageSwitcher's modalBackdrop + anchored card
// pattern: a fade Modal with a backdrop Pressable that closes on outside tap.
// Values are staged in FiltersContext; only the bottom Apply button refetches.
export const FilterMenu = ({ visible, onClose, onApply }: any) => {
  const { t } = useTranslation();
  const { providers, countries, languages } = useContext(FilterOptionsContext);
  const { genresList } = useContext(GenresListContext);
  const {
    selectedGenres, setSelectedGenres,
    minYear, setMinYear, maxYear, setMaxYear,
    selectedProviders, setSelectedProviders,
    selectedLanguages, setSelectedLanguages,
    selectedCountry, setSelectedCountry,
    selectedActors, setSelectedActors,
    selectedDirectors, setSelectedDirectors,
  } = useContext(FiltersContext);

  // Clamp so min ≤ max (mirrors the old SelectionScreen handlers): bumping the
  // min above the max drags the max up with it, and vice versa.
  const handleMinYearChange = (val: string) => {
    setMinYear(val);
    if (Number(val) > Number(maxYear)) setMaxYear(val);
  };
  const handleMaxYearChange = (val: string) => {
    setMaxYear(val);
    if (Number(val) < Number(minYear)) setMinYear(val);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        {/* Stop propagation so taps inside the card don't close the menu. */}
        <Pressable style={styles.filterMenuCard} onPress={() => {}}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>{t('filters_panel_title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.panelClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Every category is its own popup row (same template throughout). */}
          <ScrollView style={styles.panelBody} contentContainerStyle={styles.panelBodyContent}>
            <View style={styles.panelSection}>
              <CinemaMultiSelectModal
                label={t('filter_genre')}
                options={genresList.length > 0 ? genresList : [t('loading_short')]}
                selectedValues={selectedGenres}
                getLabel={(g: any) => `${genreIcon(g)}  ${g}`}
                onChange={setSelectedGenres}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaYearRangeModal
                label={t('filter_year')}
                minYear={minYear}
                maxYear={maxYear}
                min={1950}
                max={MAX_YEAR}
                onChangeMin={handleMinYearChange}
                onChangeMax={handleMaxYearChange}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaMultiSelectModal
                label={t('filter_providers')}
                options={providers}
                selectedValues={selectedProviders}
                getValue={(p: any) => p.id}
                getLabel={(p: any) => p.name}
                getImage={(p: any) => p.logo_url || null}
                onChange={setSelectedProviders}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaMultiSelectModal
                label={t('filter_language')}
                options={languages}
                selectedValues={selectedLanguages}
                getValue={(l: any) => l.code}
                getLabel={(l: any) => l.native_name || l.english_name || l.code}
                onChange={setSelectedLanguages}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaSingleSelectModal
                label={t('filter_country')}
                options={countries}
                selectedValue={selectedCountry}
                getValue={(c: any) => c.code}
                getLabel={(c: any) => `${flagEmoji(c.code)}  ${c.name}`}
                onChange={setSelectedCountry}
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaTypeaheadModal
                label={t('filter_actors')}
                selected={selectedActors}
                onChange={setSelectedActors}
                endpoint="/details/searchActor"
                selectedParam="actors_selected"
              />
            </View>
            <View style={styles.panelSection}>
              <CinemaTypeaheadModal
                label={t('filter_directors')}
                selected={selectedDirectors}
                onChange={setSelectedDirectors}
                endpoint="/details/searchDirector"
                selectedParam="directors_selected"
              />
            </View>
          </ScrollView>

          <View style={styles.panelFooter}>
            <CinemaButton title={t('filter_apply')} onPress={onApply} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const WHEEL_ITEM_HEIGHT = 28;
const WHEEL_VISIBLE_COUNT = 3;
const WHEEL_PAD_COUNT = Math.floor(WHEEL_VISIBLE_COUNT / 2);

const CinemaYearWheel = ({ label, value, min, max, onChange }: any) => {
  const years = Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  const scrollRef = useRef<ScrollView>(null);
  const hasInitialScrolledRef = useRef(false);
  const lastReportedRef = useRef<string>(value || years[0]);
  // Set for one render after THIS wheel reports a change so the effect below does
  // NOT scroll-correct — re-scrolling would fight the native snap and oscillate.
  const selfChangeRef = useRef(false);
  const dragSettleTimerRef = useRef<any>(null);

  const targetIndex = Math.max(0, years.indexOf(value));

  // Reflect EXTERNAL value changes (initial value, or the other wheel's auto-clamp)
  // by scrolling to the year. Skip changes that came from this wheel's own scroll.
  useEffect(() => {
    lastReportedRef.current = value;
    if (selfChangeRef.current) {
      selfChangeRef.current = false;
      return;
    }
    if (hasInitialScrolledRef.current) {
      scrollRef.current?.scrollTo({ y: targetIndex * WHEEL_ITEM_HEIGHT, animated: true });
    }
  }, [targetIndex, value]);

  useEffect(() => () => {
    if (dragSettleTimerRef.current) clearTimeout(dragSettleTimerRef.current);
  }, []);

  // Settle to the year nearest the FINAL resting offset, taken straight from the
  // scroll event (not a throttled mid-flight sample), so the reported year always
  // matches where the wheel visually snaps.
  const settleTo = (y: number) => {
    const idx = Math.max(0, Math.min(years.length - 1, Math.round(y / WHEEL_ITEM_HEIGHT)));
    const selected = years[idx];
    if (selected !== lastReportedRef.current) {
      lastReportedRef.current = selected;
      selfChangeRef.current = true;
      onChange(selected);
    }
  };

  return (
    <View style={styles.wheelContainer}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelFrame}>
        <View style={styles.wheelDimTop} pointerEvents="none" />
        <View style={styles.wheelDimBottom} pointerEvents="none" />
        <View style={styles.wheelCenterHighlight} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          scrollEventThrottle={16}
          // Drag release with no momentum settles shortly after; if momentum
          // follows, momentum-begin cancels it and momentum-end settles instead.
          onScrollEndDrag={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            if (dragSettleTimerRef.current) clearTimeout(dragSettleTimerRef.current);
            dragSettleTimerRef.current = setTimeout(() => settleTo(y), 60);
          }}
          onMomentumScrollBegin={() => {
            if (dragSettleTimerRef.current) clearTimeout(dragSettleTimerRef.current);
          }}
          onMomentumScrollEnd={(e) => settleTo(e.nativeEvent.contentOffset.y)}
          onContentSizeChange={() => {
            if (!hasInitialScrolledRef.current) {
              scrollRef.current?.scrollTo({ y: targetIndex * WHEEL_ITEM_HEIGHT, animated: false });
              hasInitialScrolledRef.current = true;
            }
          }}
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT }}
        >
          {years.map((y) => (
            <View key={y} style={styles.wheelItem}>
              <Text style={styles.wheelItemText}>{y}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const WINDOW_WIDTH = Dimensions.get('window').width || 360;
const WINDOW_HEIGHT = Dimensions.get('window').height || 720;
// Definite cap for the filter panel's scroll area. A ScrollView with `flex: 1`
// collapses to height 0 when its ancestor has no definite height (the card only
// has maxHeight), which hid all the category rows; a pixel maxHeight lets the
// body size to its content and scroll only when it overflows.
const PANEL_BODY_MAX_HEIGHT = Math.round(WINDOW_HEIGHT * 0.62);
// Constant vertical space reserved for the reel poster so the selection screen
// fits one screen without scrolling. The poster height is fixed; its width is
// derived from it (2:3), and content is fit (contain) into that constant space.
const REEL_POSTER_HEIGHT = Math.round(WINDOW_HEIGHT * 0.46);

// Pure mapping from a horizontal scroll offset to the index of the movie sitting
// in the spotlight. With symmetric side padding and snapToInterval === itemWidth,
// movie i is centered when contentOffset.x === i * itemWidth, so we round and
// clamp. Extracted (and exported) so the carousel's centering math is unit-tested
// without having to drive real scroll events.
export function centeredIndexFromOffset(offsetX: number, itemWidth: number, count: number): number {
  if (!itemWidth || itemWidth <= 0 || !count || count <= 0) return 0;
  const idx = Math.round(offsetX / itemWidth);
  return Math.max(0, Math.min(count - 1, idx));
}

// Positive modulo: maps any (possibly negative or out-of-range) index into
// [0, count). Used to turn a looping reel's rendered index into the real movie.
export function wrapIndex(i: number, count: number): number {
  if (!count || count <= 0) return 0;
  return ((i % count) + count) % count;
}

// Maps a raw movie batch into the reel's display shape. Guards against non-array
// responses: the API returns an error OBJECT (e.g. {"vector":["This list may not
// be empty."]}) on a bad request, and `pair` is set straight from that JSON — so
// without this guard `.map` throws and white-screens the whole app on every
// platform. A non-array simply yields an empty reel (the empty state handles it).
export function toReelMovies(pair: any): any[] {
  return (Array.isArray(pair) ? pair : []).map(mapRawMovieForDetails);
}

// Horizontal snap "reel" that shows one spotlit movie at a time. Movies fade in
// and out as they pass the center, a vertical triangular spotlight beam switches
// on when one locks into place, and the reel LOOPS endlessly. Interactions:
//   - tapping the movie TITLE picks it (onSelect),
//   - tapping the centered POSTER plays its YouTube trailer in an embedded
//     miniplayer (only if a trailer exists),
//   - the Details button opens the full Details screen (onDetails).
// `movies` are display-shaped objects (mapRawMovieForDetails: name / image /
// overview / vector / id / trailer_path). `itemWidth` is injectable for tests.
export function MovieReel({ movies, onSelect, onDetails, itemWidth }: any) {
  const { t } = useTranslation();
  const list: any[] = Array.isArray(movies) ? movies : [];
  const N = list.length;
  // Width is derived from the constant poster height (2:3) so the reel fits the
  // reserved space; capped by screen width. `itemWidth` overrides for tests.
  const ITEM_WIDTH = itemWidth || Math.min(WINDOW_WIDTH * 0.72, REEL_POSTER_HEIGHT / 1.5, 300);
  const ITEM_HEIGHT = ITEM_WIDTH * 1.5;
  const sidePad = Math.max(0, (WINDOW_WIDTH - ITEM_WIDTH) / 2);

  // Loop: render three back-to-back copies and keep the user parked in the middle
  // copy, silently recentering on settle so the reel feels endless. Only loop
  // when there is more than one movie (a single movie has nothing to loop).
  const looping = N > 1;
  const renderList = looping ? [...list, ...list, ...list] : list;
  const BASE = looping ? N : 0;

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const hasInitialScrolledRef = useRef(false);
  // `renderedIndex` is the index within renderList currently in the spotlight.
  const [renderedIndex, setRenderedIndex] = useState(BASE);
  const [trailerOn, setTrailerOn] = useState(false);

  const scrollToOffset = (x: number) => {
    scrollX.setValue(x);
    scrollRef.current?.scrollTo?.({ x, animated: false });
  };

  // Fresh batch arrived: re-park at the middle copy's first item.
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    setRenderedIndex(BASE);
    setTrailerOn(false);
    scrollToOffset(BASE * ITEM_WIDTH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  // Close the trailer whenever the spotlight moves to another movie.
  useEffect(() => { setTrailerOn(false); }, [renderedIndex]);

  const handleMomentumScrollEnd = (e: any) => {
    const x = e?.nativeEvent?.contentOffset?.x ?? 0;
    let r = centeredIndexFromOffset(x, ITEM_WIDTH, renderList.length);
    // Drifted into an outer copy — jump back to the matching middle slot so the
    // reel can keep scrolling either way without ever hitting an edge.
    if (looping && (r < N || r >= 2 * N)) {
      r = N + wrapIndex(r, N);
      scrollToOffset(r * ITEM_WIDTH);
    }
    setRenderedIndex(r);
  };

  const realIndex = looping ? wrapIndex(renderedIndex, N) : Math.min(renderedIndex, Math.max(0, N - 1));
  const centered = list[realIndex];
  const centeredHasTrailer = !!extractYouTubeId(centered?.trailer_path);

  // Vertical triangular spotlight beam: narrow apex at the top, widening down
  // over the centered poster. Lights up when a poster is LOCKED on a snap point
  // and switches off while sliding between posters. Driven off the live scroll
  // *phase* (offset within one item, via Animated.modulo) rather than the
  // last-settled `renderedIndex`, so the poster currently under the beam lights
  // immediately — it does not wait for the momentum-end that updates the index.
  const spotlightOpacity = Animated.modulo(scrollX, ITEM_WIDTH).interpolate({
    inputRange: [0, ITEM_WIDTH / 2, ITEM_WIDTH],
    outputRange: [0.55, 0, 0.55],
    extrapolate: 'clamp',
  });
  const beamHalfWidth = ITEM_WIDTH * 0.62;
  const beamHeight = ITEM_HEIGHT;

  return (
    <View style={styles.reelWrap}>
      {/* Title — tap to PICK this movie. */}
      <TouchableOpacity
        testID="reel-title-select"
        onPress={() => onSelect?.(centered)}
        activeOpacity={0.7}
      >
        <Text style={styles.reelTitle} testID="reel-title" numberOfLines={2} adjustsFontSizeToFit>
          {centered?.name || ''}
        </Text>
      </TouchableOpacity>

      <View style={[styles.reelStage, { height: ITEM_HEIGHT }]}>
        <Animated.View
          testID="reel-spotlight"
          pointerEvents="none"
          style={[
            styles.reelSpotlight,
            {
              opacity: spotlightOpacity,
              borderLeftWidth: beamHalfWidth,
              borderRightWidth: beamHalfWidth,
              borderBottomWidth: beamHeight,
            },
          ]}
        />

        <Animated.ScrollView
          testID="reel-scroll"
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: sidePad }}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onContentSizeChange={() => {
            if (!hasInitialScrolledRef.current) {
              scrollToOffset(BASE * ITEM_WIDTH);
              hasInitialScrolledRef.current = true;
            }
          }}
        >
          {renderList.map((movie: any, index: number) => {
            const isCentered = index === renderedIndex;
            const hasTrailer = !!extractYouTubeId(movie?.trailer_path);
            const opacity = scrollX.interpolate({
              inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH],
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[styles.reelItem, { width: ITEM_WIDTH, height: ITEM_HEIGHT, opacity }]}
              >
                <TouchableOpacity
                  testID={`reel-poster-${index}`}
                  activeOpacity={0.85}
                  disabled={!isCentered}
                  onPress={isCentered ? () => { if (hasTrailer) setTrailerOn(true); } : undefined}
                  style={styles.reelPoster}
                >
                  <Image
                    source={{ uri: movie?.image }}
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.ScrollView>

        {/* Embedded trailer miniplayer — opened by tapping the centered poster.
            Rendered as an overlay so the reel keeps its constant size. */}
        {trailerOn && centeredHasTrailer && (
          <View style={styles.reelTrailer} testID="reel-trailer">
            <TrailerPlayer url={centered.trailer_path} />
            <TouchableOpacity
              testID="reel-trailer-close"
              onPress={() => setTrailerOn(false)}
              style={styles.reelTrailerClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.reelTrailerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Details — opens the full Details screen. */}
      <View style={styles.reelDetailWrap}>
        <TouchableOpacity
          testID="reel-details"
          style={styles.reelDetailsBtn}
          onPress={() => onDetails?.(centered)}
          activeOpacity={0.8}
        >
          <Text style={styles.reelDetailsText}>{t('details').toUpperCase()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SelectionScreen({ navigation }: any) {
  const { stack, pushToStack, clearStack } = useContext(StackContext);
  const { pair, setPair } = useContext(PairContext);
  const { vector, setVector, clearVector } = useContext(VectorContext);
  const { genres } = useContext(GenresContext);
  const {
    selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear,
    selectedProviders, selectedLanguages, selectedCountry,
    setSelectedProviders, setSelectedLanguages, setSelectedCountry,
    selectedActors, setSelectedActors, selectedDirectors, setSelectedDirectors,
  } = useContext(FiltersContext);
  const { region } = useContext(LocaleContext);
  const { t } = useTranslation();

  // ISO country sent to the backend for provider availability. The panel's
  // explicit country selection wins; otherwise fall back to the detected region,
  // then to the default.
  const countryCode = selectedCountry || region || DEFAULT_COUNTRY_CODE;

  // Ids extracted from the {id,name} actor/director objects for the API.
  const actorIds = (selectedActors || []).map((a: any) => a.id);
  const directorIds = (selectedDirectors || []).map((d: any) => d.id);

  const { isPanelOpen, openPanel, closePanel } = useContext(FilterUIContext);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  // Map the raw batch into the display shape the reel (and stack/lineup) expect.
  // Memoized on `pair` so the reel only resets when a genuinely new batch lands.
  // Declared with the other hooks (above the early returns) to keep hook order stable.
  const reelMovies = useMemo(() => toReelMovies(pair), [pair]);

  const requestMoviePair = (
    currentGenres = selectedGenres,
    currentMin = minYear,
    currentMax = maxYear,
    freshSelection = true,
    currentVector = vector,
    currentIds = stack.map((s: any) => s.id)
  ) => {
    const genreIds = (currentGenres ?? [])
      .map((name: string) => genres.find((g: any) => g?.name?.toLowerCase() === name.toLowerCase())?.id)
      .filter((id: any) => id !== undefined && id !== null) as number[];
    // Endpoint split is dictated by the backend: twelve_options REQUIRES a vector
    // (an empty one 400s with {"vector":["This list may not be empty."]}), so the
    // cold-start / Start Over / Apply Filters batch — which has no vector yet —
    // must come from start_movies. Once the user has picked at least once we have
    // a 43-dim vector and switch to the fuller twelve_options reel, carrying the
    // already-seen ids so the next batch excludes them.
    freshSelection
      ? requestFirstPair(genreIds, currentMin, currentMax)
      : requestMovieBatch(genreIds, currentMin, currentMax, currentVector, currentIds);
  }

  // Cold-start batch from GET /movies/start_movies/ — the only endpoint that
  // works without a vector. Returns a small array (≈2) that seeds the reel until
  // the first pick produces a vector.
  const requestFirstPair = (
    genreIds: number[],
    currentMin = minYear,
    currentMax = maxYear,
  ) => {
    const isMinValid = currentMin && currentMin.length === 4 && Number(currentMin) >= 1900 && Number(currentMin) <= MAX_YEAR;
    const isMaxValid = currentMax && currentMax.length === 4 && Number(currentMax) >= 1900 && Number(currentMax) <= MAX_YEAR;
    const minY = isMinValid ? currentMin : MIN_YEAR.toString();
    const maxY = isMaxValid ? currentMax : MAX_YEAR.toString();

    const params = [
      `genres=${encodeURIComponent('[' + genreIds.join(',') + ']')}`,
      `adult=0`,
      `min_year=${encodeURIComponent(minY)}`,
      `max_year=${encodeURIComponent(maxY)}`,
      `country_code=${encodeURIComponent(countryCode)}`,
      // start_movies does not accept original_language; it is POST-body only.
      `providers=${encodeURIComponent('[' + (selectedProviders || []).join(',') + ']')}`,
      `actors=${encodeURIComponent('[' + actorIds.join(',') + ']')}`,
      `directors=${encodeURIComponent('[' + directorIds.join(',') + ']')}`,
    ];
    const url = `${localTest}/movies/start_movies/?${params.join('&')}`;

    setIsError(false);
    setIsEmpty(false);
    setIsLoading(true);
    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(response => response.json())
      .then(json => {
        setPair(json);
        setIsEmpty(!Array.isArray(json) || json.length < 1);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  }

  // Fetches up to 12 movies for the reel from POST /movies/twelve_options/. Body
  // mirrors the old two_options payload; the vector is only sent when it is a
  // full 43-dim vector, else []. isEmpty trips when fewer than one movie comes
  // back (the reel shows a single movie at a time, so one is enough).
  const requestMovieBatch = (
    genreIds: number[],
    currentMin = minYear,
    currentMax = maxYear,
    currentVector = vector,
    currentIds = stack.map((s: any) => s.id)
  ) => {
    let url = `${localTest}/movies/twelve_options/`;
    let body = {
      vector: currentVector.length === 43 ? currentVector : [],
      min_year: currentMin && currentMin.length === 4 ? parseInt(currentMin) : MIN_YEAR,
      max_year: currentMax && currentMax.length === 4 ? parseInt(currentMax) : MAX_YEAR,
      genres: genreIds,
      adult: 0,
      ids: currentIds.filter(Boolean),
      country_code: countryCode,
      original_language: (selectedLanguages || []) as string[],
      providers: (selectedProviders || []) as number[],
      actors: actorIds as number[],
      directors: directorIds as number[],
    };

    setIsError(false);
    setIsEmpty(false);
    setIsLoading(true);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(response => response.json())
      .then(json => {
        setPair(json);
        setIsEmpty(!Array.isArray(json) || json.length < 1);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    // Guard on isEmpty so an empty API result ([]) doesn't retrigger a fetch loop.
    if (pair.length === 0 && !isEmpty) {
      requestMoviePair();
    } else {
      setIsLoading(false);
    }
  }, [pair.length, isEmpty]);

  // requestMoviePair reads provider/actor/etc straight from the FiltersContext
  // closure, so a reset that clears them and requests in the same render would
  // fire with stale values. This flag defers the request to the next render,
  // after the cleared values have landed.
  const [pendingResetRequest, setPendingResetRequest] = useState(false);
  useEffect(() => {
    if (pendingResetRequest) {
      setPendingResetRequest(false);
      requestMoviePair(selectedGenres, minYear, maxYear, true, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResetRequest]);

  // 3. Filter handlers just stage values — request fires on "Request New Movies".
  // Genre + min/max year are now edited inside FilterMenu (which owns their
  // change/clamp handlers), so SelectionScreen no longer needs local ones here.

  const handleRequestNewMovies = () => {
    clearStack();
    clearVector();
    // "Start Over" clears the extra side-panel filters (keeps genre + year), then
    // refetches. Deferred via the pending flag so the request sees the cleared
    // values rather than the stale closure (same pattern as Reset Filters).
    clearExtraFilters();
    setPendingResetRequest(true);
  };

  // Clears ONLY the Story 3 side-panel filters (providers / language / country /
  // cast / directors), leaving genre + year range intact. Country resets to ''
  // so it falls back to the detected region again.
  const clearExtraFilters = () => {
    setSelectedProviders(null);
    setSelectedLanguages(null);
    setSelectedCountry('');
    setSelectedActors([]);
    setSelectedDirectors([]);
  };

  // No-results recovery action. Per spec, "Reset Filters" clears only the extra
  // director/actor/language/country/provider filters (keeping genre + years),
  // then re-requests with the surviving genre + year staging.
  const handleResetFilters = () => {
    clearExtraFilters();
    clearStack();
    clearVector();
    setPendingResetRequest(true);
  };

  // No on-screen scroll anymore — "Adjust Filters" just opens the filter panel.
  const handleAdjustFilters = () => {
    openPanel();
  };

  // Side-panel "Apply": closes the drawer and immediately fetches a fresh pair
  // using the current filters (incl. the just-set provider/cast/etc selections).
  // Dismissing via the scrim or ✕ only closes — it does not fetch.
  const handleApplyFilters = () => {
    closePanel();
    clearStack();
    clearVector();
    requestMoviePair(selectedGenres, minYear, maxYear, true, []);
  };

  // 4. Selection Logic (Vector Math happens here)
  const handleSelection = (chosenMovie: any) => {
    const { selectionHandler, detailsHandler, ...movieToStore } = chosenMovie;
    pushToStack(movieToStore);

    let newVector: number[] = [];
    const movieVector = chosenMovie.vector || [];

    if (vector.length === 0) {
      // Rule 1: Replace empty vector on selection
      newVector = movieVector;
    } else if (movieVector.length === 43 && vector.length === 43) {
      // Rule 2: Average existing vector on selection
      newVector = vector.map((val, idx) => (val + movieVector[idx]) / 2);
    } else {
      newVector = vector; // Fallback just in case
    }

    setVector(newVector);

    const newIds = [...stack.map((s: any) => s.id), chosenMovie.id];

    // Pass newVector directly to API so we don't wait for React state to update.
    // We stay on the reel — picking just refreshes it with the next batch.
    requestMoviePair(selectedGenres, minYear, maxYear, false, newVector, newIds);
  };

  // Reel Details button → full Details screen. The reel passes the already
  // display-shaped movie (mapRawMovieForDetails output), which DetailsScreen
  // consumes directly.
  const handleDetails = (movie: any) => {
    if (!movie) return;
    navigation.navigate('Details', { movie });
  };

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('error_title')} />
          <Text style={styles.subText}>{t('error_subtitle')}</Text>
          <View style={styles.spacerLarge} />
          <CinemaButton
            title={t('retry_connection')}
            onPress={() => requestMoviePair(selectedGenres, minYear, maxYear, vector.length === 0, vector)}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('loading_title')} />
          <Text style={styles.subText}>{t('loading_subtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const showEmpty = isEmpty || (pair?.length ?? 0) < 1;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FilterMenu visible={isPanelOpen} onClose={closePanel} onApply={handleApplyFilters} />

      {/* Single screen, no vertical scroll: the reel fills the space between the
          header and the pinned Start Over button. */}
      <View style={styles.selectionBody}>
        {showEmpty ? (
          <View style={styles.emptyState}>
            <MarqueeHeader text={t('empty_title')} variant="blue" />
            <Text style={styles.subText}>{t('empty_subtitle')}</Text>
            <View style={styles.spacer} />
            <CinemaButton title={t('reset_filters')} onPress={handleResetFilters} />
            <View style={styles.spacer} />
            <CinemaButton title={t('adjust_filters')} type="secondary" onPress={handleAdjustFilters} />
          </View>
        ) : (
          <MovieReel movies={reelMovies} onSelect={handleSelection} onDetails={handleDetails} />
        )}
      </View>

      <View style={styles.selectionFooter}>
        <CinemaButton title={t('start_over')} onPress={handleRequestNewMovies} />
      </View>
    </SafeAreaView>
  );
}

function DetailsScreen({ route, navigation }: any) {
  const { stack, clearStack, removeFromStack } = useContext(StackContext);
  const { clearPair } = useContext(PairContext);
  const { clearVector } = useContext(VectorContext);
  const {
    setSelectedGenres, setMinYear, setMaxYear,
    setSelectedProviders, setSelectedLanguages, setSelectedCountry,
    setSelectedActors, setSelectedDirectors,
  } = useContext(FiltersContext);
  const { t } = useTranslation();
  const { movie } = route.params || {};

  // Tapping a credited person opens the Search screen pre-filled with that name
  // in the matching mode; SearchResultsScreen auto-runs the fetch from its
  // query/mode params, so the results are already on screen.
  const openPersonSearch = (name: string, mode: 'actor' | 'director') => {
    if (!name) return;
    navigation.navigate('SearchResults', { query: name, mode });
  };

  const handleStartOver = () => {
    clearStack();
    clearVector();
    setSelectedGenres(null);
    setMinYear(MIN_YEAR.toString());
    setMaxYear(MAX_YEAR.toString());
    // Start Over also clears the extra side-panel filters.
    setSelectedProviders(null);
    setSelectedLanguages(null);
    setSelectedCountry('');
    setSelectedActors([]);
    setSelectedDirectors([]);
    clearPair();
    navigation.popToTop();
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        {movie ? (
          <View style={styles.ticketBooth}>
            <View style={styles.posterWrap}>
              <Image
                source={{ uri: movie.image }}
                style={{ width: 200, height: 300, borderRadius: 10, borderWidth: 2, borderColor: COLORS.gold }}
                resizeMode="cover"
              />
              {(() => {
                const n = Number(movie.score);
                if (!Number.isFinite(n) || n <= 0) return null;
                return (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingStar}>★</Text>
                    <Text style={styles.ratingText}>{n.toFixed(1)}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={[styles.text, { fontSize: 30, color: COLORS.gold, textAlign: 'center', marginHorizontal: 20 }]}>
              {movie.name}
            </Text>

            <TrailerPlayer url={movie.trailer_path} />

            <View style={{ width: '90%', marginVertical: 15, backgroundColor: COLORS.cardBg, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue }}>
              <PeopleLinks
                label={t('label_director')}
                value={movie.director}
                mode="director"
                onPressPerson={openPersonSearch}
              />
              <PeopleLinks
                label={t('label_starring')}
                value={movie.actor}
                mode="actor"
                onPressPerson={openPersonSearch}
              />
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_year')}</Text>
                {movie.year || t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 15 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{t('label_genres')}</Text>
                {movie.genres && movie.genres.length ? movie.genres.join(', ') : t('unknown')}
              </Text>
              <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 15, lineHeight: 24 }}>
                {movie.overview || t('no_overview')}
              </Text>
            </View>
          </View>
        ) : (<Text style={styles.subText}>{t('no_details')}</Text>)}
        {stack.length > 0 && (
          <View style={styles.lineupSection}>
            <View style={styles.lineupCabinet}>
              <MarqueeHeader text={t('now_showing')} variant="blue" containerStyle={styles.lineupHeaderInCabinet} />
              <View style={styles.lineupMarquee}>
              <View style={styles.lineupBoard}>
                {stack.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.lineupRail,
                      index === 0 && styles.lineupRailFirst,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.lineupRailTitleWrap}
                      onPress={() => navigation.push('Details', { movie: item })}
                      activeOpacity={0.5}
                    >
                      <Text
                        style={styles.lineupRailTitle}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {item.name || item}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeFromStack(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.lineupRemove}
                      activeOpacity={0.5}
                    >
                      <Text style={styles.lineupRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
            </View>
          </View>
        )}
        <View style={styles.spacerLarge} />
        <View style={styles.spacerLarge} />
        <CinemaButton
          title={t('back_to_selection')}
          onPress={() => navigation.navigate('Pick a movie')}
        />
        <View style={styles.spacer} />
        <CinemaButton
          title={t('start_over')}
          onPress={handleStartOver}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function RecommendationsScreen({ navigation }: any) {
  const { vector } = useContext(VectorContext);
  const { stack, removeFromStack } = useContext(StackContext);
  const { genres } = useContext(GenresContext);
  const {
    selectedGenres, minYear, maxYear,
    selectedProviders, selectedLanguages, selectedCountry,
    selectedActors, selectedDirectors,
  } = useContext(FiltersContext);
  const { region } = useContext(LocaleContext);
  const { t } = useTranslation();

  const countryCode = selectedCountry || region || DEFAULT_COUNTRY_CODE;
  const actorIds = (selectedActors || []).map((a: any) => a.id);
  const directorIds = (selectedDirectors || []).map((d: any) => d.id);

  const [recs, setRecs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const hasVector = vector.length === 43;

  const requestRecommendations = () => {
    const genreIds = (selectedGenres ?? [])
      .map((name: string) => genres.find((g: any) => g?.name?.toLowerCase() === name.toLowerCase())?.id)
      .filter((id: any) => id !== undefined && id !== null) as number[];

    // Body mirrors the selection reel's twelve_options payload verbatim.
    const body = {
      vector: vector.length === 43 ? vector : [],
      min_year: minYear && minYear.length === 4 ? parseInt(minYear) : MIN_YEAR,
      max_year: maxYear && maxYear.length === 4 ? parseInt(maxYear) : MAX_YEAR,
      genres: genreIds,
      adult: 0,
      ids: stack.map((s: any) => s.id).filter(Boolean),
      country_code: countryCode,
      original_language: (selectedLanguages || []) as string[],
      providers: (selectedProviders || []) as number[],
      actors: actorIds as number[],
      directors: directorIds as number[],
    };

    setIsError(false);
    setIsLoading(true);
    fetch(`${localTest}/movies/twelve_options/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(response => response.json())
      .then(json => {
        setRecs(Array.isArray(json) ? json.slice(0, 4) : []);
        setIsLoading(false);
      })
      .catch(error => {
        console.error(error);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (hasVector) {
      requestRecommendations();
    } else {
      setRecs([]);
    }
    // requestRecommendations reads filter values from the context closure; we
    // refetch on vector change (the running pick), guarded by hasVector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vector]);

  // Maps a raw twelve_options object to the MovieCard-mapped shape DetailsScreen
  // expects (same mapping SelectionScreen uses for MovieCard).
  const goToDetails = (rec: any) => {
    navigation.push('Details', {
      movie: {
        name: rec?.title,
        image: rec?.image_url,
        actor: rec?.actors ? String(rec.actors).replace(/[\[\]']/g, '') : 'Unknown',
        director: rec?.director || 'Unknown',
        overview: rec?.overview,
        year: rec?.release_date ? String(rec.release_date).slice(0, 4) : undefined,
        genres: Array.isArray(rec?.genres) ? rec.genres.map((g: any) => g.name).filter(Boolean) : [],
        vector: rec?.vector,
        id: rec?.id,
        score: rec?.vote_average,
        trailer_path: rec?.trailer_path,
      },
    });
  };

  // Cold start: no running pick yet — placeholder CTA, no endpoint call.
  if (!hasVector) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('rec_empty_title')} />
          <Text style={styles.subText}>{t('rec_empty_subtitle')}</Text>
          <View style={styles.spacer} />
          <CinemaButton
            title={t('back_to_selection')}
            onPress={() => navigation.navigate('Pick a movie')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('error_title')} />
          <Text style={styles.subText}>{t('error_subtitle')}</Text>
          <View style={styles.spacerLarge} />
          <CinemaButton title={t('retry_connection')} onPress={requestRecommendations} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>
          <MarqueeHeader text={t('loading_title')} />
          <Text style={styles.subText}>{t('loading_subtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        <MarqueeHeader text={t('your_recommendations')} />
        <View style={styles.recRow}>
          {recs.map((rec: any, index: number) => (
            <View key={rec?.id ?? index} style={styles.recCell}>
              <PosterButton imageUri={rec?.image_url} onPress={() => goToDetails(rec)} />
            </View>
          ))}
        </View>

        {stack.length > 0 && (
          <View style={styles.lineupSection}>
            <View style={styles.lineupCabinet}>
              <MarqueeHeader text={t('now_showing')} variant="blue" containerStyle={styles.lineupHeaderInCabinet} />
              <View style={styles.recCloud}>
                {stack.map((item: any, index: number) => (
                  <View key={item?.id ?? index} style={styles.recCloudCell}>
                    <PosterButton
                      imageUri={item.image}
                      onPress={() => navigation.push('Details', { movie: item })}
                    />
                    <TouchableOpacity
                      onPress={() => removeFromStack(item.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.recRemove}
                      activeOpacity={0.5}
                    >
                      <Text style={styles.recRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.spacerLarge} />
        <CinemaButton
          title={t('back_to_selection')}
          onPress={() => navigation.navigate('Pick a movie')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Maps a raw movie object (from searchMovie or the POST /movies/details/ lookup)
// to the MovieCard-mapped shape DetailsScreen expects — same mapping
// SelectionScreen/RecommendationsScreen use before navigation.push('Details').
// Turns the comma-joined people string that mapRawMovieForDetails produces
// (e.g. "Tom Hanks, Tim Allen" from the Python-stringified `actors` list, or a
// lone `director`) back into individual trimmed names. Drops blanks and the
// 'Unknown' placeholder so they never render as a tappable search link.
export function splitPeople(value: any): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s.toLowerCase() !== 'unknown');
}

// A Details credit line ("Director:" / "Starring:") whose people render as
// inline, tappable links into the Search screen. Each name calls
// onPressPerson(name, mode) so the caller can navigate to SearchResults with
// the matching mode (actor / director). Falls back to the localized "unknown"
// label (non-tappable) when there are no real names.
export function PeopleLinks({ label, value, mode, onPressPerson }: any) {
  const { t } = useTranslation();
  const names = splitPeople(value);
  return (
    <Text style={{ fontFamily: 'Limelight-Regular', color: COLORS.textLight, fontSize: 16, marginBottom: 8 }}>
      <Text style={{ fontWeight: 'bold', color: COLORS.gold }}>{label}</Text>
      {names.length === 0 ? (
        <Text>{t('unknown')}</Text>
      ) : (
        names.map((name, i) => (
          <React.Fragment key={`${mode}-${name}-${i}`}>
            {i > 0 ? <Text>, </Text> : null}
            <Text
              testID={`person-link-${mode}-${i}`}
              style={{ color: COLORS.blue, textDecorationLine: 'underline' }}
              onPress={() => onPressPerson(name, mode)}
            >
              {name}
            </Text>
          </React.Fragment>
        ))
      )}
    </Text>
  );
}

function mapRawMovieForDetails(m: any) {
  return {
    name: m?.title,
    image: m?.image_url,
    actor: m?.actors ? String(m.actors).replace(/[\[\]']/g, '') : 'Unknown',
    director: m?.director || 'Unknown',
    overview: m?.overview,
    year: m?.release_date ? String(m.release_date).slice(0, 4) : undefined,
    genres: Array.isArray(m?.genres) ? m.genres.map((g: any) => g.name).filter(Boolean) : [],
    vector: m?.vector,
    id: m?.id,
    score: m?.vote_average,
    trailer_path: m?.trailer_path,
  };
}

// Results screen reached from the main-screen search box. Reads the submitted
// query + initial mode from route params, lets the user refine the query and
// switch the search endpoint via single-select chips (Movie / Actor / Director),
// and re-runs the fetch whenever the submitted query or mode changes. Movie mode
// renders poster cards; actor/director mode renders people with their films.
function SearchResultsScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { region } = useContext(LocaleContext);
  const { selectedCountry } = useContext(FiltersContext);
  const countryCode = selectedCountry || region || DEFAULT_COUNTRY_CODE;

  // `query` is the SUBMITTED query that actually drives fetches; `draft` is the
  // editable refine-box text, promoted to `query` only on submit.
  const [query, setQuery] = useState<string>(route?.params?.query || '');
  const [draft, setDraft] = useState<string>(route?.params?.query || '');
  const [mode, setMode] = useState<'movie' | 'actor' | 'director'>(
    route?.params?.mode || 'movie',
  );
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const reqIdRef = useRef(0);

  // Re-run the search whenever the submitted query or the selected mode changes.
  // Mirrors PanelTypeahead's URL-building; encodes the *_selected param as [].
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }
    const myReq = ++reqIdRef.current;
    setIsLoading(true);
    setIsError(false);

    let url: string;
    if (mode === 'movie') {
      url = `${localTest}/movies/searchMovie/?q=${encodeURIComponent(q)}`;
    } else if (mode === 'actor') {
      url = `${localTest}/details/searchActor?q=${encodeURIComponent(q)}&actors_selected=${encodeURIComponent('[]')}`;
    } else {
      url = `${localTest}/details/searchDirector?q=${encodeURIComponent(q)}&directors_selected=${encodeURIComponent('[]')}`;
    }

    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(res => res.json())
      .then(json => {
        if (myReq !== reqIdRef.current) return; // stale response, ignore
        const list = Array.isArray(json) ? json : (json?.data || []);
        setResults(list);
        setIsLoading(false);
      })
      .catch(err => {
        if (myReq !== reqIdRef.current) return;
        console.error('Search failed', err);
        setResults([]);
        setIsError(true);
        setIsLoading(false);
      });
  }, [query, mode]);

  const handleRefineSubmit = () => {
    const q = draft.trim();
    if (!q) return;
    setQuery(q);
  };

  const openMovieDetails = (movie: any) => {
    navigation.push('Details', { movie: mapRawMovieForDetails(movie) });
  };

  // A person's movie only arrives as {movie__id, movie__title}; fetch the full
  // object via POST /movies/details/ before opening Details.
  const openPersonMovie = (movieId: any) => {
    fetch(`${localTest}/movies/details/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [movieId], country_code: countryCode }),
    })
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        const full = list[0];
        if (full) {
          navigation.push('Details', { movie: mapRawMovieForDetails(full) });
        }
      })
      .catch(err => console.error('Movie details lookup failed', err));
  };

  const MODES: Array<{ key: 'movie' | 'actor' | 'director'; label: string }> = [
    { key: 'movie', label: t('search_mode_movie') },
    { key: 'actor', label: t('search_mode_actor') },
    { key: 'director', label: t('search_mode_director') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={{ width: '100%' }}>
        <View style={styles.searchBoxContainer}>
          <TextInput
            style={styles.panelInput}
            placeholder={t('search_placeholder')}
            placeholderTextColor={COLORS.borderDark}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleRefineSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />

          <View style={styles.chipCloud}>
            {MODES.map(m => {
              const active = mode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.chip, active ? styles.chipSelected : styles.chipUnselected]}
                  onPress={() => setMode(m.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextSelected : styles.chipTextUnselected]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isError ? (
          <View style={styles.emptyState}>
            <MarqueeHeader text={t('error_title')} />
            <Text style={styles.subText}>{t('error_subtitle')}</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.emptyState}>
            <MarqueeHeader text={t('loading_title')} />
            <Text style={styles.subText}>{t('loading_subtitle')}</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <MarqueeHeader text={t('search_no_results')} variant="blue" />
          </View>
        ) : mode === 'movie' ? (
          <View style={styles.searchMovieGrid}>
            {results.map((movie: any) => (
              <View key={String(movie.id)} style={styles.searchMovieCell}>
                <Text
                  style={[styles.textGold, styles.text, { textAlign: 'center', marginBottom: 6 }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {movie.title}
                </Text>
                <PosterButton imageUri={movie.image_url} onPress={() => openMovieDetails(movie)} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.searchPeopleList}>
            {results.map((person: any) => (
              <View key={String(person.id)} style={styles.searchPersonCard}>
                <View style={styles.typeaheadResult}>
                  <Text style={styles.typeaheadResultName}>{person.name}</Text>
                  {person.movie_count != null && (
                    <Text style={styles.typeaheadResultMeta}>
                      {t('search_movie_count', { count: person.movie_count })}
                    </Text>
                  )}
                </View>
                {(person.movies || []).map((mv: any) => (
                  <TouchableOpacity
                    key={String(mv.movie__id)}
                    style={styles.searchPersonMovie}
                    onPress={() => openPersonMovie(mv.movie__id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.searchPersonMovieText}>{mv.movie__title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.spacerLarge} />
        <CinemaButton
          title={t('back_to_selection')}
          onPress={() => navigation.navigate('Pick a movie')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [stack, setStack] = useState<any[]>([]);
  const [pair, setPair] = useState<any[]>([]);
  const [vector, setVector] = useState<number[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [genresList, setGenresList] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[] | null>(null);
  const [minYear, setMinYear] = useState(MIN_YEAR.toString());
  const [maxYear, setMaxYear] = useState(MAX_YEAR.toString());

  // Story 3 side-panel filter state. Actors/directors hold {id, name} objects so
  // chips can show names while only ids are sent to the API.
  const [selectedProviders, setSelectedProviders] = useState<number[] | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[] | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedActors, setSelectedActors] = useState<any[]>([]);
  const [selectedDirectors, setSelectedDirectors] = useState<any[]>([]);

  // Filter menu open/close state, lifted to App() so the nav-bar FilterTrigger
  // (rendered by the navigator) can open the menu that SelectionScreen renders.
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => setIsPanelOpen(false);

  // Lookup lists for the side panel, fetched once on mount.
  const [providerOptions, setProviderOptions] = useState<any[]>([]);
  const [countryOptions, setCountryOptions] = useState<any[]>([]);
  const [languageOptions, setLanguageOptions] = useState<any[]>([]);

  // Re-detected each launch (no persistence). `region` is reserved for the
  // streaming-providers row once the backend exposes provider data.
  const { t } = useTranslation();
  const [language, setLanguageState] = useState<string>(detectLanguage());
  const region = detectRegion();
  const setLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLanguageState(lng);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const pushToStack = (item: any) => {
    setStack(prevStack => [...prevStack, item]);
  };

  const removeFromStack = (id: any) => {
    setStack(prevStack => prevStack.filter(item => item?.id !== id));
  };

  const clearStack = () => setStack([]);
  const clearPair = () => setPair([]);
  const clearVector = () => setVector([]);

  useEffect(() => {
    fetch(`${localTest}/details/genres/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(json => {
        let rawData = json.data || json || [];
        setGenres(rawData);

        // Handle if API returns objects [{name: 'Action'}] instead of strings
        if (rawData.length > 0 && typeof rawData[0] === 'object') {
          rawData = rawData.map((g: any) => g.name || g.genre);
        }

        // MAGIC TRICK: 'new Set()' automatically destroys any duplicate values!
        const uniqueGenres = Array.from(new Set(rawData.filter(Boolean))) as string[];

        // Sort alphabetically so the dropdown looks nice
        uniqueGenres.sort();

        setGenresList(uniqueGenres);
      })
      .catch(err => console.error("Could not fetch genres", err));
  }, []);

  // Fetch the side-panel lookup lists once on mount. NOTE: the languages endpoint
  // path is the backend's misspelling "lenguages" (intentional, not a typo here).
  useEffect(() => {
    const loadList = (path: string, setter: (v: any[]) => void, label: string) => {
      fetch(`${localTest}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(json => setter(Array.isArray(json) ? json : (json?.data || [])))
        .catch(err => console.error(`Could not fetch ${label}`, err));
    };
    loadList('/details/providers', setProviderOptions, 'providers');
    loadList('/details/countries', setCountryOptions, 'countries');
    loadList('/details/lenguages', setLanguageOptions, 'languages');
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LocaleContext.Provider value={{ language, setLanguage, region }}>
      <GenresContext.Provider value={{ genres, setGenres }}>
        <GenresListContext.Provider value={{ genresList, setGenresList }}>
          <VectorContext.Provider value={{ vector, setVector, clearVector }}>
            <FiltersContext.Provider value={{
              selectedGenres, setSelectedGenres, minYear, setMinYear, maxYear, setMaxYear,
              selectedProviders, setSelectedProviders,
              selectedLanguages, setSelectedLanguages,
              selectedCountry, setSelectedCountry,
              selectedActors, setSelectedActors,
              selectedDirectors, setSelectedDirectors,
            }}>
            <FilterOptionsContext.Provider value={{ providers: providerOptions, countries: countryOptions, languages: languageOptions }}>
            <FilterUIContext.Provider value={{ isPanelOpen, openPanel, closePanel }}>
            <StackContext.Provider value={{ stack, pushToStack, removeFromStack, clearStack }}>
              <PairContext.Provider value={{ pair, setPair, clearPair }}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
                <NavigationContainer theme={MyTheme}>
                  <Stack.Navigator
                    initialRouteName="Pick a movie"
                    screenOptions={{
                      headerStyle: { backgroundColor: COLORS.primaryRed },
                      headerTintColor: COLORS.gold,
                      headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
                      headerTitleAlign: 'center',
                      headerRight: () => <LanguageSwitcher />,
                    }}>
                    <Stack.Screen
                      name="Pick a movie"
                      component={SelectionScreen}
                      options={{
                        title: t('app_title'),
                        // Filters live only on the selection screen. The FilterTrigger
                        // sits on the LEFT of the centered title (no back button on the
                        // initial route, so headerLeft is free)...
                        headerLeft: () => (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FilterTrigger />
                            <SearchTrigger />
                          </View>
                        ),
                        // ...and headerRight (where the FilterTrigger used to be) now
                        // holds the Recommendations shortcut to the left of the
                        // language control.
                        headerRight: () => (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <RecommendationsTrigger />
                            <LanguageSwitcher />
                          </View>
                        ),
                      }}
                    />
                    <Stack.Screen name="Details" component={DetailsScreen} options={{ title: t('details_title') }} />
                    <Stack.Screen name="Recommendations" component={RecommendationsScreen} options={{ title: t('recommendations_title') }} />
                    <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: t('search_results_title') }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </PairContext.Provider>
            </StackContext.Provider>
            </FilterUIContext.Provider>
            </FilterOptionsContext.Provider>
            </FiltersContext.Provider>
          </VectorContext.Provider>
        </GenresListContext.Provider>
      </GenresContext.Provider>
      </LocaleContext.Provider>
    </SafeAreaProvider>
  );
}

// --- THEME COLORS ---
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.primaryRed,
    text: COLORS.gold,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    width: 220,
    height: 220,
  },
  langTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langTriggerText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  langCard: {
    position: 'absolute',
    top: 56,
    right: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 6,
    minWidth: 140,
  },
  langRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  langRowText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    color: COLORS.textLight,
  },
  langRowTextActive: {
    color: COLORS.gold,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  posterWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.cardBg + 'E6',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStar: {
    fontSize: 14,
    color: COLORS.gold,
    marginRight: 3,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  ratingText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    color: COLORS.gold,
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  movieContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
  },
  movieCard: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: COLORS.background,
  },
  // --- SPOTLIGHT REEL ---
  // Single-screen selection layout: body fills the space, footer is pinned.
  selectionBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionFooter: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  reelWrap: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  reelTitle: {
    fontFamily: 'Oswald-Bold',
    fontSize: 26,
    color: COLORS.gold,
    textAlign: 'center',
    letterSpacing: 1,
    paddingHorizontal: 16,
    minHeight: 36,
    marginBottom: 10,
  },
  reelStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Vertical triangular spotlight beam (apex at top, widening down). The three
  // border widths are set inline from the item size; here we just colour it: the
  // bottom border is the beam, the side borders are transparent.
  reelSpotlight: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.gold,
  },
  reelItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  reelPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 4,
  },
  reelDetailWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 20,
  },
  reelDetailsBtn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blue,
    backgroundColor: COLORS.cardBg,
  },
  reelDetailsText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  reelSynopsis: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  reelTrailer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background + 'F2',
    paddingHorizontal: 12,
  },
  reelTrailerClose: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryRed,
    backgroundColor: COLORS.cardBg,
  },
  reelTrailerCloseText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 1,
  },
  text: {
    fontFamily: 'Oswald-Bold',
    fontSize: 24,
    lineHeight: 28,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 10,
  },
  subText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  marqueeContainer: {
    marginBottom: 40,
    backgroundColor: COLORS.primaryRed,
    padding: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  marqueeBorder: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dotted',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 4,
  },
  marqueeText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 28,
    lineHeight: 32,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'black',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  marqueeContainerBlue: {
    backgroundColor: COLORS.darkBlue,
    borderColor: COLORS.blue,
    shadowColor: COLORS.blue,
  },
  marqueeBorderBlue: {
    borderColor: COLORS.blue,
  },
  marqueeTextBlue: {
    color: COLORS.textLight,
  },
  ticketBooth: {
    alignItems: 'center',
    width: '100%',
  },
  spacer: { height: 15 },
  spacerLarge: { height: 40 },
  historyItem: {
    fontFamily: 'Limelight-Regular',
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.textLight,
    marginVertical: 0,
  },
  lineupSection: {
    width: '100%',
    alignItems: 'stretch',
  },
  lineupCabinet: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderStyle: 'dotted',
    borderRadius: 10,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  lineupHeaderInCabinet: {
    marginBottom: 12,
  },
  lineupMarquee: {
    width: '100%',
    backgroundColor: COLORS.marqueeFrame,
    padding: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.marqueeFrame,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  lineupBoard: {
    backgroundColor: COLORS.marqueeBoard,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  lineupRail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.marqueeRail,
    paddingVertical: 8,
  },
  lineupRailFirst: {
    borderTopWidth: 1,
    borderTopColor: COLORS.marqueeRail,
  },
  lineupRailTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  lineupRailTitle: {
    fontFamily: 'Oswald-Bold',
    fontSize: 22,
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: COLORS.marqueeInk,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  lineupRemove: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lineupRemoveText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.marqueeInk,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  recRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  recCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  recCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  recCloudCell: {
    width: '30%',
    marginHorizontal: '1.5%',
    position: 'relative',
  },
  recRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.cardBg + 'E6',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recRemoveText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 22,
    lineHeight: 24,
    color: COLORS.gold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  cinemaBtn: {
    borderRadius: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimary: {
    width: 250,
    height: 60,
    backgroundColor: COLORS.primaryRed,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  btnSecondary: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.darkBlue,
    borderWidth: 2,
    borderColor: COLORS.blue,
  },
  btnInnerBorder: {
    flex: 1,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderStyle: 'dotted',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerPrimary: { borderColor: COLORS.gold },
  btnInnerSecondary: { borderColor: COLORS.blue },
  btnText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 16,
    letterSpacing: 1,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
  },
  textGold: { color: COLORS.gold },
  textWhite: { color: COLORS.textLight },
  dropdownHeader: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dropdownHeaderText: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchBoxContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchMovieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
  },
  searchMovieCell: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchPeopleList: {
    width: '100%',
    paddingHorizontal: 14,
  },
  searchPersonCard: {
    marginBottom: 18,
  },
  searchPersonMovie: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  searchPersonMovieText: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
  },
  filtersContainerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 20,
    zIndex: 10,
  },
  genreTriggerWrap: {
    width: '95%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 20,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 12,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    margin: 4,
  },
  chipIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
  },
  chipIconFallback: {
    fontSize: 15,
    marginRight: 6,
  },
  chipUnselected: {
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.gold,
  },
  chipText: {
    fontFamily: 'Oswald-Bold',
    fontSize: 14,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  chipTextUnselected: {
    color: COLORS.gold,
  },
  chipTextSelected: {
    color: COLORS.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  modalAction: {
    fontFamily: 'Limelight-Regular',
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  wheelContainer: {
    width: '45%',
    alignItems: 'center',
  },
  wheelLabel: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginBottom: 4,
  },
  wheelFrame: {
    width: '100%',
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT,
    backgroundColor: COLORS.marqueeBoard,
    borderWidth: 2,
    borderColor: COLORS.marqueeFrame,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelCenterHighlight: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    height: WHEEL_ITEM_HEIGHT,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.marqueeRail,
    zIndex: 2,
  },
  wheelDimTop: {
    position: 'absolute',
    top: 0,
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(244, 239, 226, 0.65)',
    zIndex: 1,
  },
  wheelDimBottom: {
    position: 'absolute',
    top: WHEEL_ITEM_HEIGHT * (WHEEL_PAD_COUNT + 1),
    height: WHEEL_ITEM_HEIGHT * WHEEL_PAD_COUNT,
    width: '100%',
    backgroundColor: 'rgba(244, 239, 226, 0.65)',
    zIndex: 1,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.marqueeInk,
    lineHeight: WHEEL_ITEM_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontSize: 18,
    letterSpacing: 1.5,
  },

  // --- FILTER SIDE PANEL ---
  filtersBadge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBadgeText: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Dropdown menu card: anchored near the top (under the header), mirroring
  // LanguageSwitcher's langCard. modalBackdrop centers, so override with
  // top alignment + marginTop to pin it below the nav bar.
  filterMenuCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    alignSelf: 'center',
    marginTop: 48,
    marginBottom: 'auto',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 8,
    overflow: 'hidden',
    paddingTop: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  panelTitle: {
    fontFamily: 'Limelight-Regular',
    color: COLORS.gold,
    fontSize: 20,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 1,
  },
  panelClose: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.gold,
    fontSize: 22,
    lineHeight: 26,
    includeFontPadding: false,
    paddingHorizontal: 6,
  },
  panelBody: {
    // NOT flex:1 — see PANEL_BODY_MAX_HEIGHT. A definite maxHeight lets the body
    // size to its content and scroll only when the categories overflow.
    maxHeight: PANEL_BODY_MAX_HEIGHT,
  },
  panelBodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  panelSection: {
    marginBottom: 22,
  },
  panelSectionTitle: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  panelInput: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 4,
    color: COLORS.textLight,
    fontFamily: 'Oswald-Bold',
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  panelHint: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.borderDark,
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    marginTop: 8,
  },
  typeaheadResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  typeaheadResultName: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.gold,
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    flexShrink: 1,
  },
  typeaheadResultMeta: {
    fontFamily: 'Oswald-Bold',
    color: COLORS.blue,
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    marginLeft: 8,
  },
  panelFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
    alignItems: 'center',
  },
});

export default App;