import React, { useRef, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ZoomableImageModalProps {
  visible: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ZoomableImageModal({
  visible,
  imageUrl,
  title = "Bill Image",
  onClose,
}: ZoomableImageModalProps) {
  const [loading, setLoading] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);

  // Animated values
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Mutable refs for tracking gesture states without rerenders
  const currentScale = useRef(1);
  const currentPan = useRef({ x: 0, y: 0 });
  const currentRotation = useRef(0);
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef(1);
  const initialPan = useRef({ x: 0, y: 0 });
  const lastTap = useRef<number>(0);

  // Reset transform state when modal opens or closes
  useEffect(() => {
    if (visible) {
      resetZoom(false);
      setLoading(true);
    }
  }, [visible]);

  const resetZoom = (animated = true) => {
    currentScale.current = 1;
    currentPan.current = { x: 0, y: 0 };
    currentRotation.current = 0;
    setZoomPercent(100);

    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 7 }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
      pan.setValue({ x: 0, y: 0 });
      rotateAnim.setValue(0);
    }
  };

  const handleZoomIn = () => {
    const nextScale = Math.min(Number((currentScale.current + 0.5).toFixed(1)), 5);
    currentScale.current = nextScale;
    setZoomPercent(Math.round(nextScale * 100));
    Animated.spring(scale, {
      toValue: nextScale,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const handleZoomOut = () => {
    const nextScale = Math.max(Number((currentScale.current - 0.5).toFixed(1)), 1);
    currentScale.current = nextScale;
    setZoomPercent(Math.round(nextScale * 100));

    if (nextScale === 1) {
      currentPan.current = { x: 0, y: 0 };
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 7 }),
      ]).start();
    } else {
      Animated.spring(scale, {
        toValue: nextScale,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }
  };

  const handleRotate = () => {
    const nextRotation = (currentRotation.current + 90) % 360;
    currentRotation.current = nextRotation;
    Animated.timing(rotateAnim, {
      toValue: nextRotation,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleDoubleTap = () => {
    if (currentScale.current > 1.2) {
      // Reset back to 1x
      resetZoom(true);
    } else {
      // Zoom in to 2.5x
      const targetScale = 2.5;
      currentScale.current = targetScale;
      setZoomPercent(250);
      Animated.spring(scale, {
        toValue: targetScale,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Handle two-finger gestures or single finger when moved
        return (
          gestureState.numberActiveTouches === 2 ||
          (currentScale.current > 1 && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2))
        );
      },
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          initialDistance.current = Math.hypot(dx, dy);
          initialScale.current = currentScale.current;
        } else if (touches.length === 1) {
          // Double tap detection
          const now = Date.now();
          if (now - lastTap.current < 300) {
            handleDoubleTap();
            lastTap.current = 0;
            return;
          }
          lastTap.current = now;
          initialPan.current = { ...currentPan.current };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && initialDistance.current) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.hypot(dx, dy);
          const factor = distance / initialDistance.current;
          let newScale = initialScale.current * factor;
          newScale = Math.max(1, Math.min(newScale, 5));
          currentScale.current = newScale;
          scale.setValue(newScale);
          setZoomPercent(Math.round(newScale * 100));
        } else if (touches.length === 1 && currentScale.current > 1) {
          const newX = initialPan.current.x + gestureState.dx;
          const newY = initialPan.current.y + gestureState.dy;

          // Restrict bounds so image remains within view
          const maxPanX = (SCREEN_WIDTH * (currentScale.current - 1)) / 1.5;
          const maxPanY = (SCREEN_HEIGHT * (currentScale.current - 1)) / 1.5;
          const clampedX = Math.max(-maxPanX, Math.min(newX, maxPanX));
          const clampedY = Math.max(-maxPanY, Math.min(newY, maxPanY));

          pan.setValue({ x: clampedX, y: clampedY });
          currentPan.current = { x: clampedX, y: clampedY };
        }
      },
      onPanResponderRelease: () => {
        initialDistance.current = null;
        if (currentScale.current <= 1) {
          currentScale.current = 1;
          currentPan.current = { x: 0, y: 0 };
          Animated.parallel([
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          ]).start();
          setZoomPercent(100);
        } else {
          setZoomPercent(Math.round(currentScale.current * 100));
        }
      },
    })
  ).current;

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.modalBackdrop}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle}>
              Pinch • Drag • Double-tap to zoom
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomBadgeText}>{zoomPercent}%</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}

        {/* Interactive Image Container */}
        {imageUrl ? (
          <View style={styles.gestureContainer} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.imageWrapper,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: scale },
                    { rotate: rotateInterpolation },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
              />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="broken-image" size={48} color="#666" />
            <Text style={styles.errorText}>No image available</Text>
          </View>
        )}

        {/* Bottom Control Toolbar */}
        <View style={styles.bottomToolbar}>
          {/* Zoom Out Button */}
          <TouchableOpacity
            style={[styles.toolbarButton, currentScale.current <= 1 && styles.buttonDisabled]}
            onPress={handleZoomOut}
            disabled={currentScale.current <= 1}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="remove"
              size={22}
              color={currentScale.current <= 1 ? "#666" : "#fff"}
            />
          </TouchableOpacity>

          {/* Reset / Current Zoom Button */}
          <TouchableOpacity
            style={styles.toolbarCenterButton}
            onPress={() => resetZoom(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="center-focus-strong" size={18} color="#1976d2" />
            <Text style={styles.toolbarCenterText}>{zoomPercent}%</Text>
          </TouchableOpacity>

          {/* Zoom In Button */}
          <TouchableOpacity
            style={[styles.toolbarButton, currentScale.current >= 5 && styles.buttonDisabled]}
            onPress={handleZoomIn}
            disabled={currentScale.current >= 5}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add"
              size={22}
              color={currentScale.current >= 5 ? "#666" : "#fff"}
            />
          </TouchableOpacity>

          <View style={styles.toolbarDivider} />

          {/* Rotate Button */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleRotate}
            activeOpacity={0.7}
          >
            <MaterialIcons name="rotate-right" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Reset All Button */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => resetZoom(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(13, 13, 13, 0.85)",
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#9e9e9e",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  zoomBadge: {
    backgroundColor: "rgba(25, 118, 210, 0.25)",
    borderWidth: 1,
    borderColor: "#1976d2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  zoomBadgeText: {
    color: "#64b5f6",
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    position: "absolute",
    zIndex: 10,
    alignItems: "center",
  },
  loadingText: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 10,
  },
  gestureContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#777",
    fontSize: 15,
    marginTop: 10,
  },
  bottomToolbar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 42 : 28,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28, 28, 30, 0.92)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: "transparent",
  },
  toolbarCenterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(25, 118, 210, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(25, 118, 210, 0.4)",
  },
  toolbarCenterText: {
    color: "#90caf9",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  toolbarDivider: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: 6,
  },
});
