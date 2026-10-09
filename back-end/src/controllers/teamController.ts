import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/teamService'
import type { CreateTeamDto } from '../dtos/team/createTeamDto.ts'
import type { UpdateTeamDto } from '../dtos/team/updateTeamDto.ts'

type TeamIdParams = { id: string }

type CreateTeamRequest = Request<Record<string, never>, unknown, CreateTeamDto>
type UpdateTeamRequest = Request<TeamIdParams, unknown, UpdateTeamDto>

export async function retrieveAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await service.findAll()
    res.json(teams)
  } catch (error) {
    next(error)
  }
}

export async function retrieveOne(req: Request<TeamIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await service.findById(Number(req.params.id))
    res.json(team)
  } catch (error) {
    next(error)
  }
}

export async function create(req: CreateTeamRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await service.create(req.body)
    res.status(201).json(team)
  } catch (error) {
    next(error)
  }
}

export async function update(req: UpdateTeamRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await service.update(Number(req.params.id), req.body)
    res.json(team)
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request<TeamIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(Number(req.params.id))
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}