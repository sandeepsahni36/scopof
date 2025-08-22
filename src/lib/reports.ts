<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Inspection Report | scopoStay</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #2563EB;
            --primary-hover: #1d4ed8;
            --light-bg: #f8fafc;
            --border-color: #e2e8f0;
            --text-color: #334155;
            --text-light: #64748b;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --header-bg: #2563EB;
            --header-text: #ffffff;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f1f5f9;
            color: var(--text-color);
            line-height: 1.6;
            position: relative;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        .report-header {
            background: var(--header-bg);
            color: var(--header-text);
            padding: 30px;
            border-radius: 10px 10px 0 0;
            margin-bottom: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo-placeholder {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 20px;
        }
        
        .company-info h1 {
            font-size: 28px;
            margin-bottom: 5px;
        }
        
        .company-info p {
            opacity: 0.9;
        }
        
        .report-info {
            text-align: right;
        }
        
        .report-info .detail-value {
            color: white;
            font-size: 20px;
            font-weight: bold;
        }
        
        .report-info .detail-label {
            color: rgba(255, 255, 255, 0.9);
        }
        
        .report-content {
            background: white;
            border-radius: 0 0 10px 10px;
            box-shadow: var(--shadow);
            overflow: hidden;
            margin-bottom: 24px;
            position: relative;
        }
        
        .inspection-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            padding: 25px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
        }
        
        .detail-label {
            font-size: 14px;
            color: var(--text-light);
            margin-bottom: 4px;
        }
        
        .detail-value {
            font-weight: 600;
            font-size: 16px;
        }
        
        .section {
            padding: 25px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        .section-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .section-title {
            font-size: 22px;
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .section-subtitle {
            color: var(--text-light);
            font-size: 14px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        
        th {
            text-align: left;
            padding: 12px 16px;
            font-weight: 600;
            font-size: 14px;
            color: var(--text-light);
            border-bottom: 2px solid var(--border-color);
        }
        
        td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }
        
        tr:last-child td {
            border-bottom: none;
        }
        
        .status-cell {
            text-align: center;
            width: 100px;
        }
        
        .status-available {
            color: #16a34a;
            font-weight: 600;
        }
        
        .status-not-available {
            color: #dc2626;
            font-weight: 600;
        }
        
        .status-not-working {
            color: #ea580c;
            font-weight: 600;
        }
        
        .photos-container {
            margin-top: 30px;
        }
        
        .photos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
        }
        
        @media (max-width: 900px) {
            .photos-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        @media (max-width: 600px) {
            .photos-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .photo-item {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow);
            transition: transform 0.2s ease;
            background: var(--light-bg);
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .photo-item:hover {
            transform: translateY(-4px);
        }
        
        .photo-link {
            display: block;
            text-decoration: none;
            color: inherit;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .photo-img-container {
            height: 200px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e2e8f0;
        }
        
        .photo-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        .photo-fallback {
            color: var(--text-light);
            font-size: 14px;
            text-align: center;
            padding: 20px;
        }
        
        .photo-label {
            padding: 15px;
            background: white;
            text-align: center;
            font-weight: 600;
            border-top: 1px solid var(--border-color);
        }
        
        .general-condition {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            padding: 20px;
            background: var(--light-bg);
            border-radius: 8px;
        }
        
        .condition-item {
            text-align: center;
        }
        
        .condition-status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            margin-top: 8px;
        }
        
        .condition-good {
            background-color: #dcfce7;
            color: #166534;
        }
        
        .condition-fair {
            background-color: #fef9c3;
            color: #854d0e;
        }
        
        .condition-bad {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .signature-section {
            padding: 30px;
            background: var(--light-bg);
            border-radius: 8px;
            margin-top: 40px;
        }
        
        .signature-title {
            text-align: center;
            font-size: 20px;
            margin-bottom: 25px;
            color: var(--primary-color);
            font-weight: 600;
        }
        
        .signature-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        @media (max-width: 768px) {
            .signature-container {
                grid-template-columns: 1fr;
            }
        }
        
        .signature-box {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: var(--shadow);
            height: 200px;
            display: flex;
            flex-direction: column;
        }
        
        .signature-label {
            font-weight: 600;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .signature-area {
            flex-grow: 1;
            border: 2px dashed var(--border-color);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-light);
            margin-bottom: 15px;
        }
        
        .signature-name {
            text-align: center;
            font-weight: 600;
            border-top: 1px solid var(--border-color);
            padding-top: 15px;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            color: rgba(0, 0, 0, 0.08);
            font-size: 40px;
            font-weight: bold;
            pointer-events: none;
            z-index: -1; /* Changed to -1 to place behind content */
            white-space: nowrap;
            text-align: center;
        }
        
        .photo-date {
            text-align: center;
            margin-top: 20px;
            color: var(--text-light);
            font-size: 14px;
        }
        
        .no-photos {
            text-align: center;
            padding: 40px;
            color: var(--text-light);
            background: var(--light-bg);
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .no-photos i {
            font-size: 48px;
            margin-bottom: 16px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="watermark">
        Generated by scopoStay • Professional Property Inspection Platform
    </div>
    
    <div class="container">
        <div class="report-header">
            <div class="logo-container">
                <div class="logo-placeholder">SS</div>
                <div class="company-info">
                    <h1>scopoStay</h1>
                    <p>Professional Property Inspection Platform</p>
                </div>
            </div>
            <div class="report-info">
                <div class="detail-value">INSPECTION REPORT</div>
                <div class="detail-label">Generated on: July 10, 2024</div>
            </div>
        </div>
        
        <div class="report-content">
            <div class="inspection-details">
                <div class="detail-item">
                    <div class="detail-label">Property</div>
                    <div class="detail-value">Oceanview Apartment 2B</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Inspection Type</div>
                    <div class="detail-value">Check-In</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Inspector</div>
                    <div class="detail-value">Jane Inspector</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date & Time</div>
                    <div class="detail-value">July 10, 2024 - 1:47 PM</div>
                </div>
            </div>
            
            <!-- Living Area Section -->
            <div class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Living Area</h2>
                        <div class="section-subtitle">Furniture, fixtures, and general condition</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="status-cell">Available</th>
                            <th class="status-cell">To Purchase</th>
                            <th class="status-cell">To Replace</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sofa Set</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Minor wear on left cushion</td>
                        </tr>
                        <tr>
                            <td>Dining Chairs</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>All chairs present</td>
                        </tr>
                        <tr>
                            <td>TV Station</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Fully functional</td>
                        </tr>
                        <tr>
                            <td>Carpet/Rug</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Clean, no stains</td>
                        </tr>
                        <tr>
                            <td>Lights and Fixtures</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>All bulbs working</td>
                        </tr>
                        <tr>
                            <td>Pot with Plant</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Healthy condition</td>
                        </tr>
                        <tr>
                            <td>Coffee Table</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Small scratch on surface</td>
                        </tr>
                        <tr>
                            <td>TV</td>
                            <td class="status-cell"><span class="status-not-available">Not Available</span></td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td>Needs to be purchased</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="general-condition">
                    <div class="condition-item">
                        <div class="detail-label">General Condition</div>
                        <div class="condition-status condition-good">Good</div>
                    </div>
                </div>
                
                <div class="photos-container">
                    <h3>Living Area Photos</h3>
                    <div class="photo-date">
                        <i class="far fa-calendar-alt"></i> Wednesday, July 10, 2024
                    </div>
                    
                    <div class="photos-grid">
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/sofa-set.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1493663284031-b7e3aaa4c4b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Sofa Set" class="photo-img">
                                </div>
                                <div class="photo-label">Sofa Set</div>
                            </a>
                        </div>
                        
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/dining-chairs.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Dining Chairs" class="photo-img">
                                </div>
                                <div class="photo-label">Dining Chairs</div>
                            </a>
                        </div>
                        
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/tv-station.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1593784991095-a205069470b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="TV Station" class="photo-img">
                                </div>
                                <div class="photo-label">TV Station</div>
                            </a>
                        </div>
                        
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/carpet.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1578898887932-dce23a595ad4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Carpet/Rug" class="photo-img">
                                </div>
                                <div class="photo-label">Carpet/Rug</div>
                            </a>
                        </div>
                        
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/lights.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1513506003901-6e3dec5b5a92?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Lights and fixtures" class="photo-img">
                                </div>
                                <div class="photo-label">Lights and fixtures</div>
                            </a>
                        </div>
                        
                        <div class="photo-item">
                            <a href="https://storage.googleapis.com/your-bucket-name/plant.jpg" class="photo-link" target="_blank">
                                <div class="photo-img-container">
                                    <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" alt="Pot with Plant" class="photo-img">
                                </div>
                                <div class="photo-label">Pot with Plant</div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Kitchen Section -->
            <div class="section">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Kitchen</h2>
                        <div class="section-subtitle">Appliances, fixtures, and utilities</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="status-cell">Available</th>
                            <th class="status-cell">To Purchase</th>
                            <th class="status-cell">To Replace</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Refrigerator</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Clean and functioning</td>
                        </tr>
                        <tr>
                            <td>Oven</td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"></td>
                            <td>Needs cleaning</td>
                        </tr>
                        <tr>
                            <td>Microwave</td>
                            <td class="status-cell"><span class="status-not-working">Not Working</span></td>
                            <td class="status-cell"></td>
                            <td class="status-cell"><span class="status-available">✔</span></td>
                            <td>Does not heat properly</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="general-condition">
                    <div class="condition-item">
                        <div class="detail-label">General Condition</div>
                        <div class="condition-status condition-fair">Fair</div>
                    </div>
                </div>
                
                <div class="photos-container">
                    <h3>Kitchen Photos</h3>
                    <div class="photo-date">
                        <i class="far fa-calendar-alt"></i> Wednesday, July 10, 2024
                    </div>
                    
                    <div class="no-photos">
                        <i class="far fa-images"></i>
                        <p>No photos available for this section</p>
                    </div>
                </div>
            </div>
            
            <!-- Signatures Section -->
            <div class="signature-section">
                <h2 class="signature-title">Signatures</h2>
                
                <div class="signature-container">
                    <div class="signature-box">
                        <div class="signature-label">Inspector Signature</div>
                        <div class="signature-area">
                            <span>Sign above this line</span>
                        </div>
                        <div class="signature-name">Jane Inspector</div>
                    </div>
                    
                    <div class="signature-box">
                        <div class="signature-label">Tenant Signature</div>
                        <div class="signature-area">
                            <span>Sign above this line</span>
                        </div>
                        <div class="signature-name">John Smith</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Basic functionality for demonstration
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for signature areas
            const signatureAreas = document.querySelectorAll('.signature-area');
            signatureAreas.forEach(area => {
                area.addEventListener('click', function() {
                    alert('Signature pad would appear here in the real application');
                });
            });
            
            // Simulate image loading errors for demonstration
            const images = document.querySelectorAll('.photo-img');
            images.forEach(img => {
                img.addEventListener('error', function() {
                    this.style.display = 'none';
                    const container = this.closest('.photo-img-container');
                    container.innerHTML = '<div class="photo-fallback"><i class="far fa-image"></i><p>Image not available</p></div>';
                });
            });
        });
    </script>
</body>
</html>