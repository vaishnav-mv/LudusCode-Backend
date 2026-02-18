import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

let io: Server

import { container } from 'tsyringe'
import { IJudgeService, IDuelService } from '../interfaces/services'
import { IProblemRepository } from '../interfaces/repositories'
import { ChatMessageResponseDTO } from '../dto/response/chat.response.dto'
import { DuelResponseDTO } from '../dto/response/duel.response.dto'
import { CompetitionResponseDTO } from '../dto/response/competition.response.dto'
import { DuelInviteDTO } from '../dto/response/duel.invite.dto'
import { StudySession, TestCase } from '../types'
import { mapDuel } from '../utils/mapper'

interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: Record<string, unknown>; // WebRTC candidate structure
}

interface DuelProgressData {
  testsPassed: number;
  totalTests: number;
  status: string;
}

export const initRealtime = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    // console.log('Client connected', socket.id)

    socket.on('join', (room: string) => {
      socket.join(room)
    })

    socket.on('leave', (room: string) => {
      socket.leave(room)
    })

    socket.on('code:change', ({ sessionId, code }: { sessionId: string, code: string }) => {
      // Broadcast to everyone in the session EXCEPT the sender
      socket.to(`session:${sessionId}`).emit('code:update', { code });
    });

    socket.on('code:run', async ({ sessionId, code, problemId, language }: { sessionId: string, code: string, problemId?: string, language?: string }) => {
      try {
        const judgeService = container.resolve<IJudgeService>("IJudgeService");

        // Scratchpad Mode
        if (!problemId) {
          const lang = language || 'javascript';
          console.log('[ws] Executing scratchpad...', { codeLength: code?.length, language: lang });
          const result = await judgeService.executeScratchpad(code, lang);
          console.log('[ws] Result:', result);
          io.to(`session:${sessionId}`).emit('execution_result', { result, runBy: socket.id });
          return;
        }

        const problemRepo = container.resolve<IProblemRepository>("IProblemRepository");
        const problem = await problemRepo.getById(problemId);
        if (!problem) {
          socket.emit('execution_result', { error: 'Problem not found' });
          return;
        }

        // Using first test case as a sample run if sample exists, else use first
        const sampleCases = (problem.testCases || []).filter((tc: TestCase) => tc.isSample);
        const casesToRun = sampleCases.length > 0 ? sampleCases : [(problem.testCases || [])[0]];
        const customInputs = casesToRun.map(tc => tc.input);
        const lang = language || 'javascript'; // judgeService needs string

        const result = await judgeService.execute(problem.id!, code, lang, customInputs);

        // Broadcast result to everyone (so they see the output of the run)
        io.to(`session:${sessionId}`).emit('execution_result', { result, runBy: socket.id });

      } catch (e: unknown) {
        console.error("Code Run Error", e);
        const message = (e instanceof Error) ? e.message : 'Execution failed';
        socket.emit('execution_result', { error: message });
      }
    });

    //WebRTC Signaling
    socket.on('signal', ({ to, signal }: { to: string, signal: SignalData }) => {
      io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('duel:progress', ({ duelId, progress }: { duelId: string, progress: DuelProgressData }) => {
      // Broadcast to opponent in the same duel room (excluding sender)
      socket.to(`duel:${duelId}`).emit('duel:progress', { playerId: socket.id, progress });
    });

    socket.on('duel:warning', async ({ duelId, userId, reason }: { duelId: string, userId: string, reason: 'paste' | 'visibility' }) => {
      try {
        const duelService = container.resolve<IDuelService>("IDuelService");
        const { duel, disqualified } = await duelService.reportWarning(duelId, userId, reason);
        if (disqualified && duel) {
          // Broadcast finished duel to both players so they redirect to summary
          const mapped = mapDuel(duel);
          if (mapped) {
            broadcastDuel(duelId, mapped);
            broadcastDuelLobby(mapped);
          }
        }
      } catch (e) {
        console.error('[ws] duel:warning error:', e);
      }
    });

    socket.on('disconnect', () => {
      // console.log('Client disconnected', socket.id)
    })
  })
}

export const broadcastChat = (groupId: string, payload: ChatMessageResponseDTO) => {
  if (io) {
    io.to(`chat:${groupId}`).emit('chat', { groupId, message: payload })
  }
}

export const broadcastDuel = (duelId: string, payload: DuelResponseDTO) => {
  if (io) {
    io.to(`duel:${duelId}`).emit('duel', { duelId, duel: payload })
  }
}

export const broadcastDuelLobby = (payload: DuelResponseDTO) => {
  if (io) {
    io.to('duel-lobby').emit('duel', { duel: payload })
  }
}

export const broadcastDuelInvite = (userId: string, payload: DuelInviteDTO) => {
  if (io) {
    io.to(`user:${userId}`).emit('duel:invite', payload)
  }
}

export const broadcastCompetition = (competitionId: string, payload: CompetitionResponseDTO) => {
  if (io) {
    io.to(`competition:${competitionId}`).emit('competition', { competitionId, competition: payload })
  }
}

export const broadcastSession = (sessionId: string, payload: Partial<StudySession> | StudySession) => {
  if (io) {
    io.to(`session:${sessionId}`).emit('session', { sessionId, session: payload })
  }
}

