import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../../services/supabase";
import { MaterialIcons } from "@expo/vector-icons";
import ZoomableImageModal from "../../../../components/ZoomableImageModal";

type Announcement = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  created_at: string;
};

export default function ApproverAnnouncementDetails() {
  const params = useLocalSearchParams<{
    id?: string;
    initialTitle?: string;
    initialDescription?: string;
    initialImageUrl?: string;
    initialDate?: string;
  }>();
  const id = params.id ? String(params.id) : undefined;
  const router = useRouter();

  const [announcement, setAnnouncement] = useState<Announcement | null>(() => {
    if (id && (params.initialTitle || params.initialImageUrl)) {
      return {
        id,
        title: params.initialTitle || "",
        description: params.initialDescription || "",
        image_url: params.initialImageUrl ? params.initialImageUrl.trim() : null,
        created_at: params.initialDate || new Date().toISOString(),
      };
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(
    () => !params.initialTitle && !params.initialImageUrl
  );
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAnnouncement();
    }
  }, [id]);

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setAnnouncement({
          ...data,
          image_url: data.image_url ? String(data.image_url).trim() : null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch approver announcement details", error);
    } finally {
      setLoading(false);
    }
  };

  const rawImageUrl = announcement?.image_url || (params.initialImageUrl ? params.initialImageUrl.trim() : null);
  const effectiveImageUrl = rawImageUrl && rawImageUrl.length > 0 ? rawImageUrl : null;

  if (loading && !announcement) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1976d2" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!announcement) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1976d2" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Announcement not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1976d2" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Announcement Details
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{announcement.title}</Text>
          <View style={styles.dateContainer}>
            <MaterialIcons name="calendar-today" size={14} color="#888" />
            <Text style={styles.date}>
              {new Date(announcement.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          {effectiveImageUrl && !imageError ? (
            <View style={styles.imageCard}>
              <TouchableOpacity
                style={styles.imageTouchable}
                activeOpacity={0.9}
                onPress={() => setIsImageModalVisible(true)}
              >
                <Image
                  source={{ uri: effectiveImageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={(err) => {
                    console.error("Failed to load announcement image", err?.nativeEvent?.error);
                    setImageError(true);
                  }}
                />
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color="#1976d2" />
                  </View>
                )}
                <View style={styles.zoomOverlay}>
                  <View style={styles.zoomBadge}>
                    <MaterialIcons name="zoom-in" size={18} color="#fff" />
                    <Text style={styles.zoomText}>Tap to Zoom</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.description}>{announcement.description}</Text>
        </View>
      </ScrollView>

      {effectiveImageUrl && !imageError ? (
        <ZoomableImageModal
          visible={isImageModalVisible}
          imageUrl={effectiveImageUrl}
          title={announcement.title || "Announcement Image"}
          onClose={() => setIsImageModalVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976d2",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: "#777",
  },
  card: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  date: {
    fontSize: 13,
    color: "#888",
    marginLeft: 6,
  },
  imageCard: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#eaeaea",
  },
  imageTouchable: {
    position: "relative",
    width: "100%",
    height: 260,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(240, 240, 240, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
  },
  zoomBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  zoomText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#444",
    lineHeight: 25,
  },
});
