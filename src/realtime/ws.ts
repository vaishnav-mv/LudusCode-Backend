import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

let io: Server

import { container } from 'tsyringe'
import { IJudgeService } from '../interfaces/services'
import { IProblemRepository } from '../interfaces/repositories'

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

    socket.on('code:change', ({ sessionId, code }) => {
      // Broadcast to everyone in the session EXCEPT the sender
      socket.to(`session:${sessionId}`).emit('code:update', { code });
    });

    socket.on('code:run', async ({ sessionId, code, problemId, language }) => {
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
        const sampleCases = (problem.testCases || []).filter((tc: any) => tc.isSample);
        const casesToRun = sampleCases.length > 0 ? sampleCases : [(problem.testCases || [])[0]];

        const result = await judgeService.execute(code, problem.solution?.code || '', casesToRun, problem, language);

        // Broadcast result to everyone (so they see the output of the run)
        io.to(`session:${sessionId}`).emit('execution_result', { result, runBy: socket.id });

      } catch (e: any) {
        console.error("Code Run Error", e);
        socket.emit('execution_result', { error: e.message || 'Execution failed' });
      }
    });

    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('disconnect', () => {
      // console.log('Client disconnected', socket.id)
    })
  })
}

export const broadcastChat = (groupId: string, payload: any) => {
  if (io) {
    io.to(`chat:${groupId}`).emit('chat', { groupId, message: payload })
  }
}

export const broadcastDuel = (duelId: string, payload: any) => {
  if (io) {
    io.to(`duel:${duelId}`).emit('duel', { duelId, duel: payload })
  }
}

export const broadcastCompetition = (competitionId: string, payload: any) => {
  if (io) {
    io.to(`competition:${competitionId}`).emit('competition', { competitionId, competition: payload })
  }
}

export const broadcastSession = (sessionId: string, payload: any) => {
  if (io) {
    io.to(`session:${sessionId}`).emit('session', { sessionId, session: payload })
  }
}

