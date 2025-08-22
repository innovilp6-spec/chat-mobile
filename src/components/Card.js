import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

export default function Card({text}) {

  // const 
  return (
    <View style={styles.card}>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  )
}

const styles= StyleSheet.create({
    card: {
        height: "100%",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",        
        // borderColor: "voilet",
        // borderWidth: 2
    },
    cardText:{
        color: "#FFFFFF",
        fontSize: 20,
        width: "80%",
        textAlign: "center"
    }
});