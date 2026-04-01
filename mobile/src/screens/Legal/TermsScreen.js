import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const S = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);
const P = ({ children }) => <Text style={styles.para}>{children}</Text>;
const B = ({ children }) => <Text style={styles.bullet}>{'• '}{children}</Text>;
const Sub = ({ children }) => <Text style={styles.subTitle}>{children}</Text>;

export default function TermsScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={20} color="#1C2E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Conditions d'Utilisation</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.updated}>Dernière mise à jour : 25 mars 2026</Text>

                <S title="1. Objet et acceptation">
                    <P>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile et des services Ombia Express, opérée par Ombia Express SAS, société de droit gabonais ayant son siège social à Libreville, Gabon.</P>
                    <P>En créant un compte, l'utilisateur reconnaît avoir lu, compris et accepté sans réserve les présentes CGU ainsi que la Politique de Confidentialité. Cette acceptation est requise pour accéder aux services.</P>
                    <P>Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser l'application.</P>
                </S>

                <S title="2. Services proposés">
                    <P>Ombia Express est une plateforme multi-services de mobilité et de commerce opérant au Gabon, proposant :</P>
                    <B>Course VTC (Véhicule de Transport avec Chauffeur) : mise en relation entre passagers et chauffeurs professionnels agréés.</B>
                    <B>Location de véhicules : mise en relation entre propriétaires de véhicules et locataires.</B>
                    <B>Service de livraison : mise en relation entre expéditeurs, commerçants et coursiers.</B>
                    <B>Marché automobile : achat et vente de véhicules entre particuliers et professionnels.</B>
                    <B>Boutiques en ligne : accès à des marchands partenaires pour la commande de produits.</B>
                    <B>Portefeuille électronique Ombia : service de paiement et de gestion de solde.</B>
                    <P>Ombia Express agit en qualité d'intermédiaire technique et n'est pas transporteur, loueur ou commerçant direct.</P>
                </S>

                <S title="3. Conditions d'inscription">
                    <Sub>3.1 Éligibilité</Sub>
                    <B>Avoir au moins 18 ans révolus.</B>
                    <B>Résider ou se trouver sur le territoire gabonais.</B>
                    <B>Fournir des informations exactes, complètes et à jour.</B>
                    <B>Disposer d'un numéro de téléphone valide au Gabon.</B>
                    <Sub>3.2 Sécurité du compte</Sub>
                    <P>L'utilisateur est seul responsable de la confidentialité de ses identifiants. Toute utilisation du compte est réputée effectuée par le titulaire. En cas de compromission, l'utilisateur doit informer immédiatement Ombia Express à support@ombiaexpress.com.</P>
                    <Sub>3.3 Vérification d'identité (KYC)</Sub>
                    <P>L'accès à certains services (chauffeur, livreur, propriétaire de véhicule, marchand) nécessite une vérification d'identité conforme aux exigences de la COBAC, du Ministère des Transports du Gabon et des régulations BEAC applicables au e-commerce.</P>
                </S>

                <S title="4. Obligations de l'utilisateur">
                    <P>L'utilisateur s'engage à :</P>
                    <B>Utiliser l'application conformément aux lois et règlements gabonais en vigueur.</B>
                    <B>Ne pas usurper l'identité d'un tiers ni fournir de fausses informations.</B>
                    <B>Ne pas utiliser la plateforme à des fins illicites, frauduleuses ou contraires à l'ordre public.</B>
                    <B>Respecter les droits des autres utilisateurs, prestataires et partenaires.</B>
                    <B>Ne pas tenter de contourner les systèmes de sécurité de l'application.</B>
                    <B>Régler les sommes dues dans les délais convenus.</B>
                    <B>Ne pas publier de contenu offensant, diffamatoire, raciste ou à caractère pornographique.</B>
                </S>

                <S title="5. Tarification et paiements">
                    <Sub>5.1 Prix des services</Sub>
                    <P>Les tarifs sont affichés avant toute commande. Ils sont exprimés en Franc CFA (XAF), monnaie officielle de la zone CEMAC. Ombia Express se réserve le droit de modifier ses tarifs avec un préavis de 7 jours.</P>
                    <Sub>5.2 Modalités de paiement</Sub>
                    <B>Portefeuille Ombia (réduction de 5% applicable)</B>
                    <B>Airtel Money (Gabon)</B>
                    <B>Moov Money (Gabon)</B>
                    <B>Carte bancaire (Visa / Mastercard)</B>
                    <B>Espèces (selon disponibilité du service)</B>
                    <Sub>5.3 Frais de service</Sub>
                    <P>Ombia Express perçoit une commission sur chaque transaction. Pour les courses VTC et la livraison, la commission est déduite des revenus du prestataire. Pour la location de véhicule, Ombia Express retient 10% du montant de la transaction à titre de frais de plateforme.</P>
                    <Sub>5.4 Remboursements</Sub>
                    <P>Les conditions de remboursement varient selon le service. Toute demande de remboursement doit être soumise dans les 48h suivant l'incident via le support intégré à l'application.</P>
                </S>

                <S title="6. Responsabilités">
                    <Sub>6.1 Responsabilité d'Ombia Express</Sub>
                    <P>Ombia Express met en œuvre tous les moyens raisonnables pour assurer la disponibilité de la plateforme (objectif de disponibilité : 99,5%). En sa qualité d'intermédiaire, la responsabilité d'Ombia Express ne saurait être engagée pour les actes ou omissions des prestataires indépendants (chauffeurs, livreurs, propriétaires, marchands).</P>
                    <Sub>6.2 Responsabilité des prestataires</Sub>
                    <P>Les chauffeurs, livreurs et autres prestataires sont des travailleurs indépendants. Ils sont seuls responsables de l'exécution de leurs prestations, de la conformité de leurs véhicules et du respect des réglementations professionnelles gabonaises applicables.</P>
                    <Sub>6.3 Force majeure</Sub>
                    <P>Ombia Express ne pourra être tenu responsable en cas de force majeure au sens du Code civil gabonais, incluant les catastrophes naturelles, grèves générales, pannes d'infrastructure nationale, décisions gouvernementales ou tout autre événement imprévisible et irrésistible.</P>
                </S>

                <S title="7. Propriété intellectuelle">
                    <P>L'intégralité des éléments de la plateforme Ombia Express (marque, logo, interface, algorithmes, base de données, contenus) est la propriété exclusive d'Ombia Express SAS, protégée par la législation gabonaise sur la propriété intellectuelle et les traités internationaux auxquels le Gabon est partie.</P>
                    <P>Toute reproduction, copie, modification ou exploitation non autorisée est strictement interdite et fera l'objet de poursuites judiciaires.</P>
                </S>

                <S title="8. Suspension et résiliation">
                    <Sub>8.1 Par l'utilisateur</Sub>
                    <P>L'utilisateur peut supprimer son compte à tout moment depuis les Paramètres de l'application. Les données seront conservées conformément aux obligations légales gabonaises (voir Politique de Confidentialité).</P>
                    <Sub>8.2 Par Ombia Express</Sub>
                    <P>Ombia Express se réserve le droit de suspendre ou résilier un compte, sans préavis ni indemnité, en cas de :</P>
                    <B>Violation des présentes CGU ou de la loi gabonaise.</B>
                    <B>Fraude, tentative de fraude ou comportement abusif avéré.</B>
                    <B>Signalements répétés d'autres utilisateurs.</B>
                    <B>Usurpation d'identité ou fourniture de faux documents.</B>
                    <B>Non-paiement des sommes dues.</B>
                </S>

                <S title="9. Protection des données personnelles">
                    <P>Le traitement des données personnelles est régi par notre Politique de Confidentialité, conforme à la Loi gabonaise n°001/2023 relative à la protection des données à caractère personnel. Pour toute question : dpo@ombiaexpress.com.</P>
                </S>

                <S title="10. Loi applicable et juridiction">
                    <P>Les présentes CGU sont soumises au droit gabonais. Tout litige relatif à leur interprétation ou exécution relèvera de la compétence exclusive des tribunaux de Libreville, Gabon, après tentative de règlement amiable préalable d'une durée de 30 jours.</P>
                    <P>Pour les litiges de consommation, l'utilisateur peut également saisir la Direction Générale de la Concurrence, de la Consommation et de la Lutte contre la Vie Chère (DGCCLVC) du Gabon.</P>
                </S>

                <S title="11. Modifications des CGU">
                    <P>Ombia Express se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront notifiés par email et/ou notification push au moins 7 jours avant l'entrée en vigueur des modifications. La poursuite de l'utilisation de l'application après ce délai vaut acceptation des nouvelles conditions.</P>
                </S>

                <S title="12. Contact">
                    <P>Pour toute question relative aux présentes CGU :</P>
                    <B>Email : legal@ombiaexpress.com</B>
                    <B>Support : support@ombiaexpress.com</B>
                    <B>Adresse : Ombia Express SAS, Libreville, Gabon</B>
                </S>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2026 Ombia Express SAS — Tous droits réservés{'\n'}
                        Société de droit gabonais — RCCM Libreville{'\n'}
                        Régulé par le Ministère des Transports du Gabon et la COBAC
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection:    'row',
        alignItems:       'center',
        padding:          16,
        backgroundColor:  '#fff',
        borderBottomWidth: 0.5,
        borderColor:      '#E5E7EB',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        flex: 1, textAlign: 'center',
        fontSize: 16, fontWeight: '800', color: '#1C2E4A',
        marginRight: 38,
    },
    scrollContent: { padding: 20, paddingBottom: 48 },
    updated: { fontSize: 11, color: '#9CA3AF', marginBottom: 20, textAlign: 'center', fontStyle: 'italic' },

    section:      { marginBottom: 22 },
    sectionTitle: {
        fontSize: 13, fontWeight: '800', color: '#1C2E4A',
        marginBottom: 8, paddingLeft: 10,
        borderLeftWidth: 3, borderLeftColor: '#FFA726',
    },
    subTitle: { fontSize: 12, fontWeight: '700', color: '#1C2E4A', marginTop: 8, marginBottom: 4 },
    para:     { fontSize: 12, color: '#374151', lineHeight: 20, marginBottom: 6 },
    bullet:   { fontSize: 12, color: '#374151', lineHeight: 20, paddingLeft: 8, marginBottom: 3 },

    footer: {
        marginTop: 12, padding: 16,
        backgroundColor: '#FFF8EE', borderRadius: 12,
        borderWidth: 1, borderColor: '#FFE0B2',
    },
    footerText: { fontSize: 11, color: '#7C5A1E', lineHeight: 18, textAlign: 'center' },
});
