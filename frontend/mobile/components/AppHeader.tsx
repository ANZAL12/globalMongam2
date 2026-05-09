import React from "react";
import { View, Image, TouchableOpacity, Alert, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";

interface AppHeaderProps {
  showBackButton?: boolean;
  logoMarginLeft?: number;
}

export default function AppHeader({ showBackButton = false, logoMarginLeft }: AppHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <View style={{ 
      flexDirection: "row", 
      alignItems: "center", 
      justifyContent: "space-between",
      height: 110,
      backgroundColor: "#fff",
      paddingTop: 50,
      paddingHorizontal: 15,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {showBackButton && (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        <View style={{ 
          marginLeft: logoMarginLeft !== undefined ? logoMarginLeft : (showBackButton ? -35 : 10), 
          justifyContent: "center", 
          height: 60, 
          width: 120 
        }}>
          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: "100%", height: "100%", resizeMode: "contain", transform: [{ scale: 2.6 }] }}
          />
        </View>
      </View>

      <TouchableOpacity
        style={{ marginTop: -20 }}
        onPress={() =>
          Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", onPress: logout, style: "destructive" },
          ])
        }
      >
        <MaterialIcons name="logout" size={25} color="#f00" />
      </TouchableOpacity>
    </View>
  );
}
