// ============================================================
//  CONFIGURATION DU SITE — Le Petit Goûter
//  Modifie uniquement ce fichier pour brancher ton Google Drive
//  et tes infos. Voir README.md pour le pas-à-pas complet.
// ============================================================

const CONFIG = {
  // Nom et texte affichés dans la barre du haut et ailleurs
  business: {
    name: "Le P'Tea Goû'Thé",
    tagline: "Salon de thé & pâtisserie",
    phone: "06 59 23 73 89",
    email: "contact.lepteagouthe@gmail.com",
    instagram: "@lepteagouthe",
    instagramUrl: "https://www.instagram.com/lepteagouthe",
    address: "1 Av. Théodore de Banville, 03000 Moulins",
    hoursHtml: "Lun-Mar Fermé<br>Mer–Sam 11h45–18h<br>Dim 11h45–17h30",
    hoursNote: "Fermé le dernier dimanche du mois",
  },

  // --- Google Drive ---
  // 1. Crée une clé API dans Google Cloud Console (voir README.md)
  // 2. Colle-la ci-dessous
  // 3. Restreins-la à ton domaine GitHub Pages une fois en ligne
  drive: {
    apiKey: "AIzaSyAAHaDON7bD2VHvMkyn7Nmt6u6ahpaf7f0",

    // L'ID du dossier "site" (dans l'URL du dossier Drive, après /folders/)
    rootFolderId: "1lJIdtn4eWrc4ZXBTh3uagyFV8ERGEnbA",

    // pour le carrousel de photos du haut de page (le "hero")
    heroFolders: ["photo_accueil"],

    // Nom du sous-dossier contenant le logo (une seule image dedans)
    logoFolder: "logo",

    // Nom du dossier qui contient TOUTES les photos de la carte (le livre).
    // À l'intérieur : un sous-dossier par catégorie (même nom que la colonne
    // "categorie" du Google Sheet), + un sous-dossier "photo_sommaire" optionnel
    // pour illustrer la page d'accueil du livre avant qu'une catégorie soit choisie.
    menuPhotosFolder: "photo_carte",
  },

  // --- Google Sheet (la carte / menu) ---
  // Colonnes attendues, dans cet ordre, avec une ligne d'en-tête :
  //   categorie | nom | description | prix | specificite
  // L'ordre des catégories dans le sommaire suit leur ordre d'apparition
  // dans la feuille. Pour chaque catégorie, si un sous-dossier du même nom
  // existe dans "image_carte" (ex: "patisserie"), ses photos illustrent la page.
  // La colonne "specificite" est libre (ex: "Bio, Sans gluten") : chaque mot
  // séparé par une virgule devient un badge à côté du nom du plat.
  sheet: {
    id: "14qSHwGnj0n5u_EzcBcymdoqY7I_C6RlE3eOq0eMvQNo",
    range: "A:E",
  },

  // --- Carte de localisation (footer) ---
  // Nom de l'établissement + adresse, ou coordonnées GPS précises (ex: "46.56816,3.33285") pour cibler l'entrée
  maps: {
    query: "46.564346,3.334622",
  },
};
