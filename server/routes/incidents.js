const express = require('express');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { authenticate, authorize } = require('../middleware/auth');
const { findNearest, findNearestN } = require('../utils/haversine');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Create incident (SOS) — any authenticated user
router.post('/', authenticate, async (req, res) => {
    try {
        const { location, accidentType, severity } = req.body;

        const incident = new Incident({
            location,
            accidentType: accidentType || 'COLLISION',
            severity: severity || 'MEDIUM',
            reportedBy: req.user._id,
            status: 'NEW',
            timeline: [{ status: 'NEW', timestamp: new Date(), updatedBy: req.user._id, note: 'Incident reported via SOS' }],
        });

        await incident.save();

        // Auto-assign nearest police
        const availablePolice = await User.find({ role: 'POLICE', status: 'AVAILABLE' });
        const nearestPolice = findNearest(location, availablePolice);

        // Auto-assign nearest ambulance
        const availableAmbulance = await User.find({ role: 'AMBULANCE', status: 'AVAILABLE' });
        const nearestAmbulance = findNearest(location, availableAmbulance);

        // Find nearest hospitals
        const hospitals = await Hospital.find({ isFull: false });
        const nearestHospital = findNearest(location, hospitals);

        if (nearestPolice) {
            incident.assignedPolice = nearestPolice.resource._id;
            await User.findByIdAndUpdate(nearestPolice.resource._id, { status: 'BUSY' });
        }
        if (nearestAmbulance) {
            incident.assignedAmbulance = nearestAmbulance.resource._id;
            await User.findByIdAndUpdate(nearestAmbulance.resource._id, { status: 'BUSY' });
        }
        if (nearestHospital) {
            incident.assignedHospital = nearestHospital.resource._id;
        }

        if (nearestPolice || nearestAmbulance) {
            incident.status = 'ASSIGNED';
            incident.timeline.push({
                status: 'ASSIGNED',
                timestamp: new Date(),
                updatedBy: req.user._id,
                note: 'Resources auto-assigned',
            });
        }

        await incident.save();

        // Populate for response
        const populated = await Incident.findById(incident._id)
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name location status')
            .populate('assignedAmbulance', 'name location status')
            .populate('assignedHospital', 'name location availableBeds');

        // Emit Socket.IO events
        const io = req.app.get('io');
        if (io) {
            io.emit('incident:new', populated);
            if (nearestPolice) {
                io.emit('police:assignment', {
                    incidentId: incident._id,
                    policeId: nearestPolice.resource._id,
                    incident: populated,
                    distance: nearestPolice.distance,
                });
            }
            if (nearestAmbulance) {
                io.emit('ambulance:assignment', {
                    incidentId: incident._id,
                    ambulanceId: nearestAmbulance.resource._id,
                    incident: populated,
                    distance: nearestAmbulance.distance,
                });
            }
            if (nearestHospital) {
                io.emit('hospital:alert', {
                    incidentId: incident._id,
                    hospitalId: nearestHospital.resource._id,
                    incident: populated,
                });
            }
        }

        res.status(201).json({ incident: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List incidents — with optional status filter
router.get('/', authenticate, async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;

        // Role-based filtering
        if (req.user.role === 'POLICE') {
            filter.assignedPolice = req.user._id;
        } else if (req.user.role === 'AMBULANCE') {
            filter.assignedAmbulance = req.user._id;
        } else if (req.user.role === 'CITIZEN') {
            filter.reportedBy = req.user._id;
        }
        // HOSPITAL and ADMIN see all (HOSPITAL filtered by assignedHospital on frontend)

        const incidents = await Incident.find(filter)
            .sort({ createdAt: -1 })
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name location status')
            .populate('assignedAmbulance', 'name location status')
            .populate('assignedHospital', 'name location availableBeds');

        res.json({ incidents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single incident
router.get('/:id', authenticate, async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name location status')
            .populate('assignedAmbulance', 'name location status')
            .populate('assignedHospital', 'name location availableBeds');

        if (!incident) return res.status(404).json({ error: 'Incident not found.' });
        res.json({ incident });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update incident status
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status, note } = req.body;
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found.' });

        incident.status = status;
        incident.timeline.push({
            status,
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: note || `Status updated to ${status}`,
        });

        // If closed, free up resources
        if (status === 'CLOSED') {
            if (incident.assignedPolice) {
                await User.findByIdAndUpdate(incident.assignedPolice, { status: 'AVAILABLE' });
            }
            if (incident.assignedAmbulance) {
                await User.findByIdAndUpdate(incident.assignedAmbulance, { status: 'AVAILABLE' });
            }
        }

        await incident.save();

        const populated = await Incident.findById(incident._id)
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name location status')
            .populate('assignedAmbulance', 'name location status')
            .populate('assignedHospital', 'name location availableBeds');

        // Emit update
        const io = req.app.get('io');
        if (io) {
            io.emit('incident:updated', populated);
        }

        res.json({ incident: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update patient info
router.patch('/:id/patient', authenticate, async (req, res) => {
    try {
        const { condition, notes } = req.body;
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found.' });

        incident.patientInfo = { condition: condition || '', notes: notes || '' };
        await incident.save();

        const io = req.app.get('io');
        if (io) io.emit('incident:updated', incident);

        res.json({ incident });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reassign hospital
router.patch('/:id/hospital', authenticate, async (req, res) => {
    try {
        const { hospitalId } = req.body;
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found.' });

        incident.assignedHospital = hospitalId;
        incident.timeline.push({
            status: incident.status,
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: 'Hospital reassigned',
        });
        await incident.save();

        const populated = await Incident.findById(incident._id)
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name location status')
            .populate('assignedAmbulance', 'name location status')
            .populate('assignedHospital', 'name location availableBeds');

        const io = req.app.get('io');
        if (io) {
            io.emit('incident:updated', populated);
            io.emit('hospital:alert', { incidentId: incident._id, hospitalId, incident: populated });
        }

        res.json({ incident: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save case notes (police investigation notes)
router.patch('/:id/notes', authenticate, async (req, res) => {
    try {
        const { caseNotes, witnesses, evidenceCollected } = req.body;
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ error: 'Incident not found.' });

        if (caseNotes !== undefined) incident.caseNotes = caseNotes;
        if (witnesses !== undefined) incident.witnesses = witnesses;
        if (evidenceCollected !== undefined) incident.evidenceCollected = evidenceCollected;

        incident.timeline.push({
            status: incident.status,
            timestamp: new Date(),
            updatedBy: req.user._id,
            note: 'Case investigation notes updated',
        });

        await incident.save();
        res.json({ incident });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate AI Incident Report (Powered by Google Gemini)
router.get('/:id/report', authenticate, async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate('reportedBy', 'name email mobile address work')
            .populate('assignedPolice', 'name email mobile status')
            .populate('assignedAmbulance', 'name email mobile status')
            .populate('assignedHospital', 'name address phone availableBeds totalBeds');

        if (!incident) return res.status(404).json({ error: 'Incident not found.' });

        // Calculate response metrics
        const created = new Date(incident.createdAt);
        const now = new Date();
        const totalDuration = Math.round((now - created) / 60000);

        let assignedTime = null, arrivedTime = null, resolvedTime = null;
        (incident.timeline || []).forEach(t => {
            if (t.status === 'ASSIGNED' && !assignedTime) assignedTime = new Date(t.timestamp);
            if (t.status === 'IN_PROGRESS' && !arrivedTime) arrivedTime = new Date(t.timestamp);
            if (t.status === 'CLOSED' && !resolvedTime) resolvedTime = new Date(t.timestamp);
        });

        const responseTime = assignedTime ? Math.round((assignedTime - created) / 1000) : null;
        const arrivalTime = arrivedTime && assignedTime ? Math.round((arrivedTime - assignedTime) / 60000) : null;
        const totalResolution = resolvedTime ? Math.round((resolvedTime - created) / 60000) : null;

        // Build case data for Gemini
        const caseData = {
            caseNumber: `HAERMS-${created.getFullYear()}-${incident._id.toString().slice(-6).toUpperCase()}`,
            accidentType: incident.accidentType,
            severity: incident.severity,
            status: incident.status,
            location: incident.location,
            reportedAt: incident.createdAt,
            reporter: incident.reportedBy ? {
                name: incident.reportedBy.name,
                email: incident.reportedBy.email,
                mobile: incident.reportedBy.mobile || 'N/A',
                address: incident.reportedBy.address || 'N/A',
                occupation: incident.reportedBy.work || 'N/A',
            } : null,
            police: incident.assignedPolice ? { name: incident.assignedPolice.name, status: incident.assignedPolice.status } : null,
            ambulance: incident.assignedAmbulance ? { name: incident.assignedAmbulance.name, status: incident.assignedAmbulance.status } : null,
            hospital: incident.assignedHospital ? { name: incident.assignedHospital.name, beds: incident.assignedHospital.availableBeds } : null,
            patientInfo: incident.patientInfo || {},
            caseNotes: incident.caseNotes || '',
            witnesses: incident.witnesses || '',
            evidenceCollected: incident.evidenceCollected || '',
            responseTimeSeconds: responseTime,
            arrivalTimeMinutes: arrivalTime,
            totalResolutionMinutes: totalResolution,
            totalDurationMinutes: totalDuration,
            timeline: (incident.timeline || []).map(t => ({ time: t.timestamp, status: t.status, note: t.note || '' })),
        };

        // Call Gemini AI for analysis
        let aiAnalysis = '';
        let aiSummary = '';
        let aiRecommendations = [];
        let aiRiskAssessment = '';
        let performanceRating = 'Good';
        let severityAnalysis = '';

        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const prompt = `You are an expert highway accident emergency response analyst for the HAERMS system (Highway Accident Emergency Response Management System). Analyze this incident data and provide a professional report.

Incident Data:
${JSON.stringify(caseData, null, 2)}

Provide your response in this EXACT JSON format (no markdown, no code blocks, just pure JSON):
{
  "aiSummary": "A 2-3 sentence executive summary of the incident",
  "aiAnalysis": "A detailed 4-6 sentence analysis of the incident, response effectiveness, and any patterns observed",
  "performanceRating": "Excellent or Good or Average or Needs Improvement",
  "severityAnalysis": "1-2 sentence analysis of the severity level and its implications",
  "riskAssessment": "1-2 sentence risk assessment for this location/type of incident",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"]
}

Be specific, professional, and data-driven in your analysis. Reference actual data from the incident.`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            // Parse AI response
            let parsed;
            try {
                // Try to extract JSON from response (handle markdown code blocks)
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
            } catch (e) {
                parsed = null;
            }

            if (parsed) {
                aiSummary = parsed.aiSummary || '';
                aiAnalysis = parsed.aiAnalysis || '';
                performanceRating = parsed.performanceRating || 'Good';
                severityAnalysis = parsed.severityAnalysis || '';
                aiRiskAssessment = parsed.riskAssessment || '';
                aiRecommendations = parsed.recommendations || [];
            }
        } catch (aiErr) {
            console.log('Gemini AI error (falling back to rule-based):', aiErr.message);
            // Fallback to rule-based analysis
            aiSummary = `Highway ${incident.accidentType.toLowerCase()} incident reported at coordinates (${incident.location.lat.toFixed(4)}, ${incident.location.lng.toFixed(4)}). Severity: ${incident.severity}. Current status: ${incident.status}.`;
            aiAnalysis = `This ${incident.severity.toLowerCase()} severity ${incident.accidentType.toLowerCase()} incident was reported and resources were dispatched. ${responseTime ? `Initial response time was ${responseTime} seconds.` : ''} ${totalResolution ? `Total resolution time: ${totalResolution} minutes.` : 'Case is still ongoing.'}`;
            const sevScore = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[incident.severity] || 2;
            severityAnalysis = sevScore >= 3 ? 'HIGH PRIORITY — Requires immediate emergency response protocols.' : 'STANDARD PRIORITY — Standard response protocols applicable.';
            if (responseTime && responseTime < 30) performanceRating = 'Excellent';
            else if (responseTime && responseTime < 120) performanceRating = 'Good';
            else if (responseTime) performanceRating = 'Needs Improvement';
            aiRiskAssessment = 'Standard risk level for this area and incident type.';
            aiRecommendations = ['Continue monitoring response times', 'Ensure adequate patrol coverage', 'Follow standard incident documentation procedures'];
        }

        // Build final report
        const report = {
            title: `HAERMS Incident Report — Case #${incident._id.toString().slice(-6).toUpperCase()}`,
            generatedAt: new Date().toISOString(),
            generatedBy: 'HAERMS AI Analysis Engine v2.0 (Powered by Google Gemini)',

            aiSummary,
            aiAnalysis,
            aiRiskAssessment,

            summary: {
                incidentId: incident._id,
                caseNumber: caseData.caseNumber,
                status: incident.status,
                accidentType: incident.accidentType,
                severity: incident.severity,
                location: incident.location,
                reportedAt: incident.createdAt,
                totalDurationMinutes: totalDuration,
            },

            reporter: caseData.reporter,

            assignedResources: {
                police: incident.assignedPolice ? {
                    name: incident.assignedPolice.name,
                    contact: incident.assignedPolice.mobile || incident.assignedPolice.email,
                    status: incident.assignedPolice.status,
                } : null,
                ambulance: incident.assignedAmbulance ? {
                    name: incident.assignedAmbulance.name,
                    contact: incident.assignedAmbulance.mobile || incident.assignedAmbulance.email,
                    status: incident.assignedAmbulance.status,
                } : null,
                hospital: incident.assignedHospital ? {
                    name: incident.assignedHospital.name,
                    address: incident.assignedHospital.address || 'N/A',
                    phone: incident.assignedHospital.phone || 'N/A',
                    bedsAvailable: incident.assignedHospital.availableBeds,
                    totalBeds: incident.assignedHospital.totalBeds,
                } : null,
            },

            patientInfo: incident.patientInfo || { condition: 'Unknown', notes: '' },

            caseInvestigation: {
                notes: incident.caseNotes || '',
                witnesses: incident.witnesses || '',
                evidenceCollected: incident.evidenceCollected || '',
            },

            responseAnalysis: {
                responseTimeSeconds: responseTime,
                arrivalTimeMinutes: arrivalTime,
                totalResolutionMinutes: totalResolution,
                performanceRating,
                severityAnalysis,
            },

            timeline: caseData.timeline,

            aiRecommendations,
        };

        res.json({ report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Chat Analysis (Admin)
router.post('/ai-chat', authenticate, async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required.' });

        // Gather system data for context
        const [incidents, policeUsers, ambulanceUsers, hospitals] = await Promise.all([
            Incident.find().sort({ createdAt: -1 }).limit(50)
                .populate('reportedBy', 'name email mobile address work')
                .populate('assignedPolice', 'name status')
                .populate('assignedAmbulance', 'name status')
                .populate('assignedHospital', 'name availableBeds totalBeds'),
            User.find({ role: 'POLICE' }).select('name status'),
            User.find({ role: 'AMBULANCE' }).select('name status'),
            Hospital.find().select('name availableBeds totalBeds isFull'),
        ]);

        const systemData = {
            totalIncidents: incidents.length,
            activeIncidents: incidents.filter(i => i.status !== 'CLOSED').length,
            closedIncidents: incidents.filter(i => i.status === 'CLOSED').length,
            criticalIncidents: incidents.filter(i => i.severity === 'CRITICAL').length,
            highIncidents: incidents.filter(i => i.severity === 'HIGH').length,
            incidentTypes: {},
            policeUnits: policeUsers.map(u => ({ name: u.name, status: u.status })),
            ambulanceUnits: ambulanceUsers.map(u => ({ name: u.name, status: u.status })),
            hospitals: hospitals.map(h => ({ name: h.name, available: h.availableBeds, total: h.totalBeds, full: h.isFull })),
            recentIncidents: incidents.slice(0, 15).map(i => ({
                id: i._id.toString().slice(-6).toUpperCase(),
                type: i.accidentType,
                severity: i.severity,
                status: i.status,
                reporter: i.reportedBy ? i.reportedBy.name : 'Unknown',
                reporterMobile: i.reportedBy ? i.reportedBy.mobile : null,
                police: i.assignedPolice ? i.assignedPolice.name : 'None',
                ambulance: i.assignedAmbulance ? i.assignedAmbulance.name : 'None',
                hospital: i.assignedHospital ? i.assignedHospital.name : 'None',
                location: i.location,
                createdAt: i.createdAt,
                caseNotes: i.caseNotes || '',
                witnesses: i.witnesses || '',
            })),
        };

        // Count incident types
        incidents.forEach(i => {
            systemData.incidentTypes[i.accidentType] = (systemData.incidentTypes[i.accidentType] || 0) + 1;
        });

        // Build chat history for context
        const historyMessages = (chatHistory || []).map(m => `${m.role === 'user' ? 'Admin' : 'AI'}: ${m.content}`).join('\n');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are HAERMS AI Assistant — an intelligent analysis engine for the Highway Accident Emergency Response Management System. You help administrators analyze incident data, understand patterns, and make better decisions.

CURRENT SYSTEM DATA:
${JSON.stringify(systemData, null, 2)}

${historyMessages ? `PREVIOUS CONVERSATION:\n${historyMessages}\n` : ''}
ADMIN'S QUESTION: ${message}

INSTRUCTIONS:
- Provide clear, data-driven analysis based on the real system data above
- Reference specific incident IDs, unit names, and numbers from the data
- If asked about trends, analyze the incident types, severity distribution, and resolution patterns
- If asked about performance, analyze response resources and availability
- If asked about specific incidents, provide detailed info from the data
- Keep responses focused, professional, and actionable
- Use bullet points and clear formatting for readability
- If data is insufficient to answer, say so honestly
- Respond in 2-4 concise paragraphs or bullet points, not excessively long`;

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text().trim();

        res.json({ reply: aiResponse });
    } catch (err) {
        console.log('AI Chat error:', err.message);
        if (err.message && err.message.includes('429')) {
            res.json({ reply: '⏳ AI rate limit reached. The free-tier Gemini API has request limits. Please wait a moment and try again. In the meantime, you can review the incident table and stats on your dashboard for quick insights.' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;
