import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToastService } from '../../services/ToastService';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button } from '../../components/ui/Button';
import { typography, spacing, borderRadius, HAZARD_CATEGORIES, categoryColors, categoryBgColors } from '../../constants';
import { lightColors } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { reportsApi } from '../../api/reports';
import { uploadMultipleToCloudinary } from '../../services/cloudinary';
import { facultiesApi } from '../../api/faculties';
import { useAuth } from '../../contexts/AuthContext';
import type { Faculty } from '../../types';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const blobToDataUrl = (blobUrl: string): Promise<string> =>
  fetch(blobUrl)
    .then(r => r.blob())
    .then(
      blob =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );

const resolveUri = (uri: string): Promise<string> =>
  isWeb && uri.startsWith('blob:') ? blobToDataUrl(uri) : Promise.resolve(uri);

export default function ReportHazardScreen({ navigation, route }: any) {
  const colors = useColors();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const preSelectedCategory = route?.params?.category;
  const isStudent = user?.role === 'student';
  const scrollRef = useRef<ScrollView>(null);
  const errorRef = useRef<View>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(preSelectedCategory || '');
  const [address, setAddress] = useState('');
  const [images, setImages] = useState<{ uri: string }[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!isStudent) loadFaculties();
    getLocation();
  }, []);

  useEffect(() => {
    if (route?.params?.category) {
      setCategory(route.params.category);
    }
  }, [route?.params?.category]);

  const loadFaculties = async () => {
    try {
      const { data } = await facultiesApi.getAll();
      if (data.success) setFaculties(data.data);
    } catch {}
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
  };

  const pickImage = async (useCamera = false) => {
    setShowPicker(false);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: !useCamera,
        ...(useCamera ? {} : { selectionLimit: 5 - images.length }),
      };
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        const resolved = await Promise.all(result.assets.map(a => resolveUri(a.uri)));
        setImages([...images, ...resolved.map(uri => ({ uri }))]);
      }
    } catch {}
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const setErrorAndScroll = (msg: string) => {
    setError(msg);
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setErrorAndScroll('Title is required'); return; }
    if (!description.trim()) { setErrorAndScroll('Description is required'); return; }
    if (!category) { setErrorAndScroll('Select a hazard category'); return; }
    if (!address.trim()) { setErrorAndScroll('Location address is required'); return; }

    setLoading(true); setError(null);
    try {
      let uploadedImages: { url: string; publicId: string }[] = [];
      if (images.length > 0) {
        ToastService.info('Uploading', `Uploading ${images.length} image(s)...`);
        uploadedImages = await uploadMultipleToCloudinary(
          images.map(img => img.uri),
          (done, total) => {
            ToastService.info('Uploading', `Uploaded ${done}/${total} image(s)...`);
          }
        );
      }

      await reportsApi.createReport({
        title: title.trim(),
        description: description.trim(),
        category,
        address: address.trim(),
        latitude: location?.lat,
        longitude: location?.lng,
        faculty: !isStudent && selectedFaculty ? selectedFaculty : undefined,
        images: uploadedImages,
      });
      ToastService.success('Report Submitted', 'Your hazard report has been received.');
      navigation.goBack();
    } catch (err: any) {
      const msg = err.message || err.response?.data?.message || 'Failed to submit report';
      setErrorAndScroll(msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Report a Hazard</Text>
            <Text style={styles.headerSub}>Help keep your campus safe</Text>
          </View>
        </View>

        {/* ── Alerts ── */}
        {error ? (
          <View ref={errorRef} style={[styles.alertBox, { backgroundColor: colors.dangerLight }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* ── Category Grid ── */}
        <Text style={styles.fieldLabel}>Hazard Category</Text>
        <View style={styles.categoryGrid}>
          {HAZARD_CATEGORIES.map((cat) => {
            const isActive = category === cat;
            const catColor = categoryColors[cat] || colors.primary;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryItem, { backgroundColor: categoryBgColors[cat] }, isActive && { borderColor: catColor, borderWidth: 2 }]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[typography.caption, { color: catColor, fontWeight: '700', textAlign: 'center' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Title ── */}
        <Text style={styles.fieldLabel}>Title</Text>
        <View style={[styles.inputBox, { borderColor: colors.border }]}>
          <Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.inputField, { color: colors.text }]}
            placeholder="Brief title of the hazard"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* ── Description ── */}
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={[styles.textAreaBox, { borderColor: colors.border }]}>
          <TextInput
            style={[styles.textArea, { color: colors.text }]}
            placeholder="Describe the hazard in detail..."
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Address ── */}
        <Text style={styles.fieldLabel}>Location / Address</Text>
        <View style={[styles.inputBox, { borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.inputField, { color: colors.text }]}
            placeholder="e.g. Main Library, 3rd Floor"
            placeholderTextColor={colors.textTertiary}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {location && (
          <View style={styles.locationDetected}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[typography.caption, { color: colors.success, marginLeft: 4 }]}>Location detected automatically</Text>
          </View>
        )}

        {/* ── Faculty & Department (auto-filled for students) ── */}
        {isStudent ? (
          <>
            <Text style={styles.fieldLabel}>Your Faculty</Text>
            <View style={[styles.infoBox, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="school-outline" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>{user?.faculty || 'N/A'}</Text>
            </View>
            {user?.department && (
              <>
                <Text style={styles.fieldLabel}>Your Department</Text>
                <View style={[styles.infoBox, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{user.department}</Text>
                </View>
              </>
            )}
          </>
        ) : faculties.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Your Faculty</Text>
            <View style={styles.facultyGrid}>
              {faculties.map((f) => (
                <TouchableOpacity
                  key={f._id}
                  style={[styles.facultyChip, { borderColor: colors.border }, selectedFaculty === f._id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedFaculty(f._id)}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.caption, { fontWeight: '600', color: colors.textSecondary }, selectedFaculty === f._id && { color: '#FFF' }]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Images ── */}
        <Text style={styles.fieldLabel}>Photos ({images.length}/5)</Text>
        <View style={styles.imageRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.imageContainer}>
              <Image source={{ uri: img.uri }} style={styles.imageThumb} />
              <TouchableOpacity style={styles.removeImage} onPress={() => removeImage(i)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={[styles.addImageBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primaryBg }]} onPress={() => setShowPicker(true)}>
              <Ionicons name="camera-outline" size={28} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginTop: 2 }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          title="Submit Report"
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      {/* ── Image Picker Modal ── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Photo</Text>
            {!isWeb && (
              <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(true)} activeOpacity={0.7}>
                <View style={[styles.sheetIconWrap, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="camera" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>Take Photo</Text>
                  <Text style={[typography.caption, { color: colors.textTertiary }]}>Use your camera</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetOption} onPress={() => pickImage(false)} activeOpacity={0.7}>
              <View style={[styles.sheetIconWrap, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="images" size={22} color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { fontWeight: '600', color: colors.text }]}>Choose from Gallery</Text>
                <Text style={[typography.caption, { color: colors.textTertiary }]}>Select from your device</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPicker(false)} activeOpacity={0.7}>
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '600' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (c: typeof lightColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: spacing.lg, paddingTop: spacing.xxxl, paddingBottom: spacing.xxl },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  headerTitle: { ...typography.h2, color: c.text },
  headerSub: { ...typography.bodySmall, color: c.textSecondary, marginTop: 1 },

  // ── Alerts ──
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  alertText: { ...typography.caption, flex: 1, fontWeight: '600' },

  // ── Fields ──
  fieldLabel: {
    ...typography.label,
    color: c.text,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },

  // ── Category Grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },

  // ── Input ──
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // ── TextArea ──
  textAreaBox: {
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  textArea: {
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: 'top',
  },

  // ── Location ──
  locationDetected: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },

  // ── Faculty ──
  facultyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  facultyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Images ──
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageContainer: { position: 'relative' },
  imageThumb: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.md,
  },
  removeImage: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: c.surface,
    borderRadius: 11,
  },
  addImageBtn: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Image Picker Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  sheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: c.surfaceAlt,
  },
});
