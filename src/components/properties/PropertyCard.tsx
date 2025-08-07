--- a/src/components/properties/PropertyCard.tsx
+++ b/src/components/properties/PropertyCard.tsx
@@ -13,7 +13,7 @@
 }
 
 const PropertyCard: React.FC<PropertyCardProps> = ({ property, onEdit, onDelete, isAdmin }) => {
-  const [showMenu, setShowMenu] = useState(false);
+  const [showMenu, setShowMenu] = useState(false); // State to control dropdown visibility
   const [hasChecklist, setHasChecklist] = useState(false);
   const [checklistLoading, setChecklistLoading] = useState(true);
 
@@ -55,7 +55,7 @@
   return (
     <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group">
       {/* Property Image Placeholder */}
-      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative">
+      <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-visible">
         <div className="absolute inset-0 flex items-center justify-center">
           <span className="text-4xl">{getPropertyTypeIcon(property.type)}</span>
         </div>
@@ -71,7 +71,7 @@
         {isAdmin && (
           <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="relative">
-              <button
+              <button // Button to toggle the dropdown menu
                 onClick={() => setShowMenu(!showMenu)}
                 className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
               >
@@ -79,7 +79,7 @@
               </button>
               
               {showMenu && (
-                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
+                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                   <button
                     onClick={() => {
                       onEdit(p
