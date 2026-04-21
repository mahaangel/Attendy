import api from './api';

export const predictionService = {
  predict: (subjectId, upcomingLeaves = 0, futureClasses = 10) =>
    api.get(`/predict/${subjectId}`, {
      params: { upcoming_leaves: upcomingLeaves, future_classes: futureClasses }
    }).then(r => r.data),
  leavePlanner: (subjectId, targetPct, futureClasses = 20) =>
    api.post('/predict/leave-planner', {
      subject_id: subjectId,
      target_percentage: targetPct,
      future_classes: futureClasses,
    }).then(r => r.data),
};

export default predictionService;
